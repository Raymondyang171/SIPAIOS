#!/usr/bin/env bash
set -euo pipefail

# Restore latest Phase1 baseline dump (DESCTRUCTIVE: will drop existing objects in target DB).
CONTAINER_NAME="${CONTAINER_NAME:-sipaios-postgres}"
DB_USER="${DB_USER:-sipaios}"
DB_NAME="${DB_NAME:-sipaios}"
BASELINE_ROOT="${BASELINE_ROOT:-artifacts/baselines/phase1_v1.1}"
OUT_DIR="${OUT_DIR:-artifacts/inspects/phase1_v1.1}"

mkdir -p "${OUT_DIR}"
LOG="${OUT_DIR}/restore_phase1_baseline.log"

echo "==[0/4] container check ==" | tee "${LOG}"
docker ps --format '{{.Names}}' | grep -qx "${CONTAINER_NAME}" || {
  echo "ERROR: container not running: ${CONTAINER_NAME}" | tee -a "${LOG}"
  exit 1
}

echo "==[1/4] locate latest dump ==" | tee -a "${LOG}"
LATEST_DIR="$(ls -1 "${BASELINE_ROOT}" 2>/dev/null | sort | tail -n 1 || true)"
if [[ -z "${LATEST_DIR}" ]]; then
  echo "ERROR: no baseline directories found under ${BASELINE_ROOT}" | tee -a "${LOG}"
  exit 1
fi

DUMP_PATH="$(ls -1 "${BASELINE_ROOT}/${LATEST_DIR}"/*.dump 2>/dev/null | head -n 1 || true)"
if [[ -z "${DUMP_PATH}" ]]; then
  echo "ERROR: no .dump file found under ${BASELINE_ROOT}/${LATEST_DIR}" | tee -a "${LOG}"
  exit 1
fi

echo "Using dump: ${DUMP_PATH}" | tee -a "${LOG}"

echo "==[2/4] pre-clean: hard reset public schema ==" | tee -a "${LOG}"
# Hard reset to remove out-of-dump dependencies (e.g., FK constraints added after baseline)
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -v ON_ERROR_STOP=1 <<'EOSQL' | tee -a "${LOG}"
-- Force drop public schema and all dependencies
DROP SCHEMA IF EXISTS public CASCADE;

-- Recreate clean public schema
CREATE SCHEMA public;

-- Restore standard permissions (use CURRENT_USER to avoid hardcoded postgres role)
GRANT USAGE, CREATE ON SCHEMA public TO public;
GRANT ALL ON SCHEMA public TO CURRENT_USER;

-- Ensure necessary extensions exist (Phase1 dump requires these)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOSQL

if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "ERROR: Pre-clean failed" | tee -a "${LOG}"
  exit 1
fi
echo "OK: Public schema reset complete" | tee -a "${LOG}"

echo "==[3/4] restore baseline dump ==" | tee -a "${LOG}"
# Feed dump into container pg_restore (no --clean needed, schema is already clean)
cat "${DUMP_PATH}" | docker exec -i "${CONTAINER_NAME}" pg_restore \
  -U "${DB_USER}" -d "${DB_NAME}" \
  --no-owner --no-privileges \
  --exit-on-error \
  | tee -a "${LOG}"

echo "==[4/5] quick sanity: count tables in public ==" | tee -a "${LOG}"
docker exec -i "${CONTAINER_NAME}" psql -U "${DB_USER}" -d "${DB_NAME}" -At -v ON_ERROR_STOP=1 \
  -c "select count(*) from pg_tables where schemaname='public';" | tee -a "${LOG}"

echo "==[5/5] done ==" | tee -a "${LOG}"
echo "Wrote log: ${LOG}" | tee -a "${LOG}"
