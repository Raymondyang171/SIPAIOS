\
#!/usr/bin/env bash
set -euo pipefail

# Export Phase1 v1.1 DDL for later seed generation (evidence-first)
# - Primary path: export only the "core tables" list (best effort)
# - Fallback: export full public schema DDL (authoritative)
#
# Outputs under:
#   artifacts/inspects/phase1_v1.1/

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="${REPO_ROOT}/artifacts/inspects/phase1_v1.1"
mkdir -p "${OUT_DIR}"

CONTAINER_NAME="${SIPAIOS_PG_CONTAINER:-sipaios-postgres}"
PGUSER="${SIPAIOS_PG_USER:-sipaios}"
PGDB="${SIPAIOS_PG_DB:-sipaios}"

CORE_OUT="${OUT_DIR}/core_tables_ddl.sql"
CORE_LOG="${OUT_DIR}/core_tables_ddl.export.log"
PUBLIC_OUT="${OUT_DIR}/public_schema_ddl.sql"
PUBLIC_LOG="${OUT_DIR}/public_schema_ddl.export.log"

CORE_TABLES=(
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

echo "==[0/4] container check ==" | tee "${CORE_LOG}"
docker ps --format 'table {{.Names}}\t{{.Status}}' | grep -E "^${CONTAINER_NAME}[[:space:]]" >> "${CORE_LOG}" || {
  echo "ERROR: container not running: ${CONTAINER_NAME}" | tee -a "${CORE_LOG}"
  exit 1
}

echo "==[1/4] list public tables ==" | tee -a "${CORE_LOG}"
docker exec -i "${CONTAINER_NAME}" psql -U "${PGUSER}" -d "${PGDB}" -At -c \
  "select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by 1;" \
  > "${OUT_DIR}/public_tables.txt" 2>> "${CORE_LOG}" || true

# Build table args for tables that exist
DUMP_TABLE_ARGS=()
if [[ -s "${OUT_DIR}/public_tables.txt" ]]; then
  for t in "${CORE_TABLES[@]}"; do
    if grep -Fxq "${t}" "${OUT_DIR}/public_tables.txt"; then
      DUMP_TABLE_ARGS+=( "--table=${t}" )
    fi
  done
fi

echo "==[2/4] export core tables (best effort) ==" | tee -a "${CORE_LOG}"
: > "${CORE_OUT}"

set +e
docker exec -i "${CONTAINER_NAME}" pg_dump -U "${PGUSER}" -d "${PGDB}" \
  --schema-only --no-owner --no-privileges --schema=public \
  "${DUMP_TABLE_ARGS[@]}" \
  > "${CORE_OUT}" 2>> "${CORE_LOG}"
RC=$?
set -e

CORE_SIZE=$(wc -c < "${CORE_OUT}" || echo 0)
echo "core_tables_ddl.sql bytes=${CORE_SIZE} rc=${RC}" | tee -a "${CORE_LOG}"
if [[ ${CORE_SIZE} -eq 0 ]]; then
  echo "WARN: core export empty (this is OK). Will rely on full public schema export." | tee -a "${CORE_LOG}"
fi

echo "==[3/4] export full public schema DDL ==" | tee "${PUBLIC_LOG}"
: > "${PUBLIC_OUT}"

docker exec -i "${CONTAINER_NAME}" pg_dump -U "${PGUSER}" -d "${PGDB}" \
  --schema-only --no-owner --no-privileges --schema=public \
  > "${PUBLIC_OUT}" 2>> "${PUBLIC_LOG}"

PUBLIC_SIZE=$(wc -c < "${PUBLIC_OUT}" || echo 0)
echo "public_schema_ddl.sql bytes=${PUBLIC_SIZE}" | tee -a "${PUBLIC_LOG}"

sha256sum "${CORE_OUT}" > "${CORE_OUT}.sha256"
sha256sum "${PUBLIC_OUT}" > "${PUBLIC_OUT}.sha256"

echo "DONE."
echo " - ${CORE_OUT}"
echo " - ${PUBLIC_OUT}"
