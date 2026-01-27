#!/usr/bin/env bash
set -euo pipefail

# Export minimal metadata needed to generate deterministic E2E seed SQL.
# Queries DB inside docker container, outputs TSVs + log.

CONTAINER_NAME="${CONTAINER_NAME:-sipaios-postgres}"
DB_USER="${DB_USER:-sipaios}"
DB_NAME="${DB_NAME:-sipaios}"
OUT_DIR="${OUT_DIR:-artifacts/inspects/phase1_v1.1}"

mkdir -p "${OUT_DIR}"

LOG="${OUT_DIR}/min_e2e_metadata.export.log"
COLS="${OUT_DIR}/min_e2e_columns.tsv"
PKS="${OUT_DIR}/min_e2e_pks.tsv"
FKS="${OUT_DIR}/min_e2e_fks.tsv"
TBL="${OUT_DIR}/min_e2e_tables.tsv"
ALL_PUBLIC="${OUT_DIR}/public_tables.tsv"

# Minimal E2E tables (adjust if your naming differs)
TABLES=(
  companies
  sites
  warehouses
  uoms
  items
  customers
  sales_orders
  sales_order_lines
  work_centers
  work_orders
  inventory_moves
  inventory_move_lines
)

# Build: 'companies','sites',... for SQL array literal
SQL_LIST=""
for t in "${TABLES[@]}"; do
  if [[ -z "${SQL_LIST}" ]]; then
    SQL_LIST="'${t}'"
  else
    SQL_LIST="${SQL_LIST},'${t}'"
  fi
done

echo "==[0/6] container check ==" | tee "${LOG}"
docker ps --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}" || {
  echo "ERROR: container not running: ${CONTAINER_NAME}" | tee -a "${LOG}"
  exit 1
}

echo "==[1/6] snapshot all public tables (for sanity) ==" | tee -a "${LOG}"
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -At -v ON_ERROR_STOP=1 \
  -c "select table_schema, table_name
      from information_schema.tables
      where table_schema='public' and table_type='BASE TABLE'
      order by table_name;" \
  | awk -F'|' 'BEGIN{OFS="\t"} {print $1,$2}' > "${ALL_PUBLIC}"
echo "public_tables_rows=$(wc -l < "${ALL_PUBLIC}" | tr -d ' ')" | tee -a "${LOG}"

echo "==[2/6] resolve requested tables existence in public schema ==" | tee -a "${LOG}"
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -At -v ON_ERROR_STOP=1 \
  -c "select 'public' as table_schema, table_name
      from information_schema.tables
      where table_schema='public'
        and table_name = any(array[${SQL_LIST}])
      order by table_name;" \
  | awk -F'|' 'BEGIN{OFS="\t"} {print $1,$2}' > "${TBL}"
echo "tables_found=$(wc -l < "${TBL}" | tr -d ' ')" | tee -a "${LOG}"

echo "==[3/6] export columns (name/type/null/default) ==" | tee -a "${LOG}"
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -At -v ON_ERROR_STOP=1 \
  -c "select c.table_name, c.ordinal_position, c.column_name, c.data_type, c.is_nullable, coalesce(c.column_default,'') as column_default
      from information_schema.columns c
      where c.table_schema='public'
        and c.table_name = any(array[${SQL_LIST}])
      order by c.table_name, c.ordinal_position;" \
  | awk -F'|' 'BEGIN{OFS="\t"} {print $1,$2,$3,$4,$5,$6}' > "${COLS}"
echo "columns_rows=$(wc -l < "${COLS}" | tr -d ' ')" | tee -a "${LOG}"

echo "==[4/6] export primary keys ==" | tee -a "${LOG}"
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -At -v ON_ERROR_STOP=1 \
  -c "select tc.table_name, kcu.ordinal_position as pk_ordinal, kcu.column_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name=kcu.constraint_name
       and tc.table_schema=kcu.table_schema
      where tc.table_schema='public'
        and tc.constraint_type='PRIMARY KEY'
        and tc.table_name = any(array[${SQL_LIST}])
      order by tc.table_name, kcu.ordinal_position;" \
  | awk -F'|' 'BEGIN{OFS="\t"} {print $1,$2,$3}' > "${PKS}"
echo "pks_rows=$(wc -l < "${PKS}" | tr -d ' ')" | tee -a "${LOG}"

echo "==[5/6] export foreign keys (child->parent) ==" | tee -a "${LOG}"
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -At -v ON_ERROR_STOP=1 \
  -c "select
        tc.table_name as child_table,
        kcu.column_name as child_column,
        ccu.table_name as parent_table,
        ccu.column_name as parent_column,
        tc.constraint_name
      from information_schema.table_constraints tc
      join information_schema.key_column_usage kcu
        on tc.constraint_name = kcu.constraint_name
       and tc.table_schema = kcu.table_schema
      join information_schema.constraint_column_usage ccu
        on ccu.constraint_name = tc.constraint_name
       and ccu.table_schema = tc.table_schema
      where tc.table_schema='public'
        and tc.constraint_type='FOREIGN KEY'
        and (tc.table_name = any(array[${SQL_LIST}])
             or ccu.table_name = any(array[${SQL_LIST}]))
      order by tc.table_name, kcu.column_name;" \
  | awk -F'|' 'BEGIN{OFS="\t"} {print $1,$2,$3,$4,$5}' > "${FKS}"
echo "fks_rows=$(wc -l < "${FKS}" | tr -d ' ')" | tee -a "${LOG}"

echo "==[6/6] done ==" | tee -a "${LOG}"
echo "OUTPUT:" | tee -a "${LOG}"
echo " - ${ALL_PUBLIC}" | tee -a "${LOG}"
echo " - ${TBL}" | tee -a "${LOG}"
echo " - ${COLS}" | tee -a "${LOG}"
echo " - ${PKS}" | tee -a "${LOG}"
echo " - ${FKS}" | tee -a "${LOG}"
echo " - ${LOG}" | tee -a "${LOG}"
