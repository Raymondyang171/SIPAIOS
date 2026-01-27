#!/usr/bin/env bash
set -euo pipefail

CONTAINER_NAME="${CONTAINER_NAME:-sipaios-postgres}"
DB_USER="${DB_USER:-sipaios}"
DB_NAME="${DB_NAME:-sipaios}"
OUT_DIR="${OUT_DIR:-artifacts/inspects/phase1_v1.1}"

mkdir -p "${OUT_DIR}"
OUT="${OUT_DIR}/db_catalog_debug.txt"

echo "==[0] container check ==" | tee "${OUT}"
docker ps --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}" || {
  echo "ERROR: container not running: ${CONTAINER_NAME}" | tee -a "${OUT}"
  exit 1
}

run_sql () {
  local title="$1"
  local sql="$2"
  echo "" | tee -a "${OUT}"
  echo "== ${title} ==" | tee -a "${OUT}"
  docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 -At -c "${sql}" \
    | sed 's/$/\n/' \
    | tee -a "${OUT}" >/dev/null
}

run_sql "[1] session identity" \
"select current_database() as db, current_user as usr;"

run_sql "[2] search_path" \
"show search_path;"

run_sql "[3] list databases (non-template)" \
"select datname from pg_database where datistemplate=false order by 1;"

run_sql "[4] list non-system schemas" \
"select nspname from pg_namespace where nspname not in ('pg_catalog','information_schema') order by 1;"

run_sql "[5] count tables per schema (non-system)" \
"select n.nspname as schema, count(*) as tables
 from pg_class c
 join pg_namespace n on n.oid=c.relnamespace
 where c.relkind='r'
   and n.nspname not in ('pg_catalog','information_schema')
 group by 1
 order by 1;"

run_sql "[6] list tables in public (pg_tables)" \
"select tablename from pg_tables where schemaname='public' order by 1;"

run_sql "[7] sample of all tables (pg_tables, non-system, limit 200)" \
"select schemaname||'.'||tablename
 from pg_tables
 where schemaname not in ('pg_catalog','information_schema')
 order by 1
 limit 200;"

echo "" | tee -a "${OUT}"
echo "DONE. Wrote: ${OUT}" | tee -a "${OUT}"
