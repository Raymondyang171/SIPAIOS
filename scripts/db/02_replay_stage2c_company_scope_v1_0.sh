#!/usr/bin/env bash
set -euo pipefail

# Stage 2C-1 wrapper: runs Stage2B replay, then applies Stage2C-1 ops/verify.
# Overrides (optional):
#   DB_CONTAINER=sipaios-postgres
#   DB_NAME=sipaios
#   DB_USER=sipaios

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

DB_CONTAINER="${DB_CONTAINER:-sipaios-postgres}"
DB_NAME="${DB_NAME:-sipaios}"
DB_USER="${DB_USER:-sipaios}"

STAGE2B="${ROOT_DIR}/scripts/db/01_replay_stage2b_rbac_v1_0.sh"
OPS_DIR="${ROOT_DIR}/phase1_schema_v1.1_sql/supabase/ops"

SQL_40="${OPS_DIR}/40_stage2c_company_scope_rls.sql"
SQL_99="${OPS_DIR}/99_stage2c_verify_company_scope_rls.sql"

timestamp_now() {
  date -u +"%Y%m%dT%H%M%SZ"
}

run_psql_in_container () {
  local sql_file="$1"
  if [[ ! -f "$sql_file" ]]; then
    echo "[ERROR] missing sql file: $sql_file" >&2
    exit 1
  fi
  echo "[INFO] apply: $(basename "$sql_file")"
  cat "$sql_file" | docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME"
}

# Setup artifacts directory
TS="$(timestamp_now)"
RUN_DIR="artifacts/replay/stage2c_1/$TS"
mkdir -p "$RUN_DIR"

LOG_INIT="$RUN_DIR/01_init.log"
LOG_APPLY="$RUN_DIR/02_apply.log"
LOG_VERIFY="$RUN_DIR/03_verify.log"
LOG_SUMMARY="$RUN_DIR/04_summary.txt"

trap 'echo "[ERROR] Stage2C-1 replay failed" >&2' ERR

# Log initialization info
{
  echo "[INFO] Stage2C-1 replay start: $TS"
  echo "[INFO] db_container=$DB_CONTAINER db_user=$DB_USER db_name=$DB_NAME"
  echo "[INFO] ops_dir=$OPS_DIR"
  echo "[INFO] sql_40=$SQL_40"
  echo "[INFO] sql_99=$SQL_99"
  echo "[INFO] run_dir=$RUN_DIR"
} | tee "$LOG_INIT" >/dev/null

# 1) Run Stage2B replay as baseline
(
  echo "[STEP] Stage2B replay baseline"
  bash "$STAGE2B"
  echo "[OK] Stage2B replay finished"
) 2>&1 | tee -a "$LOG_INIT" >/dev/null

# 2) Stage2C-1 apply (company scope RLS)
(
  echo "[STEP] apply company scope RLS"
  run_psql_in_container "$SQL_40"
  echo "[OK] apply: $(basename "$SQL_40")"
) 2>&1 | tee "$LOG_APPLY" >/dev/null

# 3) Stage2C-1 verify
(
  echo "[STEP] verify company scope RLS"
  run_psql_in_container "$SQL_99"
  echo "[OK] apply: $(basename "$SQL_99")"
) 2>&1 | tee "$LOG_VERIFY" >/dev/null

# 4) Parse verification results and generate summary
STAGE2C_RESULT="PASS"
CROSS_COMPANY_DENIED="PASS"
SAME_COMPANY_ALLOWED="PASS"

# Check for general errors in verify log
if grep -Eqi "(^|\s)(ERROR:|FATAL:)" "$LOG_VERIFY"; then
  STAGE2C_RESULT="FAIL"
fi

# Check cross-company access denial (uA/uB should NOT see other company's data)
if grep -Eq "saw cross-company (items|uoms|sales_orders|purchase_orders)" "$LOG_VERIFY"; then
  CROSS_COMPANY_DENIED="FAIL"
  STAGE2C_RESULT="FAIL"
fi

# Check if users could unexpectedly insert cross-company data
if grep -Eq "unexpectedly inserted cross-company (item|SO|PO)" "$LOG_VERIFY"; then
  CROSS_COMPANY_DENIED="FAIL"
  STAGE2C_RESULT="FAIL"
fi

# Check same-company access allowed (uA/uB should see own company's data)
if grep -Eq "cannot read own company (items|sales_orders)" "$LOG_VERIFY"; then
  SAME_COMPANY_ALLOWED="FAIL"
  STAGE2C_RESULT="FAIL"
fi

# Check service_role bypass
if grep -Eq "service_role missing multi-company visibility" "$LOG_VERIFY"; then
  STAGE2C_RESULT="FAIL"
fi

# Generate summary
cat > "$LOG_SUMMARY" <<SUM
=== STAGE2C_REPLAY_SUMMARY ===
timestamp_utc=$TS
db_container=$DB_CONTAINER
db_name=$DB_NAME
ops_dir=$OPS_DIR
stage2c_1=$STAGE2C_RESULT
verify_cross_company_denied=$CROSS_COMPANY_DENIED
verify_same_company_allowed=$SAME_COMPANY_ALLOWED
run_dir=$RUN_DIR
SUM

# Display summary
cat "$LOG_SUMMARY"

# Exit with error if verification failed
if [[ "$STAGE2C_RESULT" != "PASS" ]]; then
  echo "[ERROR] Stage2C-1 verification failed. See logs in: $RUN_DIR" >&2
  exit 1
fi

echo "[OK] Stage2C-1 replay finished"
echo "[RESULT] stage2c_1=PASS"
