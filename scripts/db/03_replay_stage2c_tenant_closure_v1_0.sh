#!/usr/bin/env bash
set -euo pipefail

# Stage 2C-2 wrapper: runs Stage2C-1 replay, then applies Stage2C-2 (tenant closure) ops/verify.
# Overrides (optional):
#   DB_CONTAINER=sipaios-postgres
#   DB_NAME=sipaios
#   DB_USER=sipaios

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

DB_CONTAINER="${DB_CONTAINER:-sipaios-postgres}"
DB_NAME="${DB_NAME:-sipaios}"
DB_USER="${DB_USER:-sipaios}"

STAGE2C_1="${ROOT_DIR}/scripts/db/02_replay_stage2c_company_scope_v1_0.sh"
OPS_DIR="${ROOT_DIR}/phase1_schema_v1.1_sql/supabase/ops"

SQL_50="${OPS_DIR}/50_stage2c_tenant_closure_wave1.sql"
SQL_99="${OPS_DIR}/99_stage2c_verify_tenant_closure.sql"

timestamp_now() {
  date -u +"%Y%m%dT%H%M%SZ"
}

# Setup artifacts directory (must be early to ensure failure summary can be written)
TS="$(timestamp_now)"
RUN_DIR="artifacts/replay/stage2c_2/$TS"
mkdir -p "$RUN_DIR"

LOG_INIT="$RUN_DIR/01_init.log"
LOG_APPLY="$RUN_DIR/02_apply.log"
LOG_VERIFY="$RUN_DIR/03_verify.log"
LOG_SUMMARY="$RUN_DIR/04_summary.txt"

LAST_ERROR=""
FAILED_STEP=""

write_summary() {
  local status="$1"
  local error_msg="${2:-}"
  local fk_enforced="${3:-N/A}"
  local composite_fk="${4:-N/A}"
  local phantom_cnt="${5:-0}"
  local phantom_with_memberships="${6:-0}"
  local phantom_with_roles="${7:-0}"

  cat > "$LOG_SUMMARY" <<SUM
=== STAGE2C_2_REPLAY_SUMMARY ===
timestamp_utc=$TS
db_container=$DB_CONTAINER
db_name=$DB_NAME
ops_dir=$OPS_DIR
stage2c_2=$status
SUM

  if [[ "$status" == "FAIL" && -n "$error_msg" ]]; then
    echo "error=$error_msg" >> "$LOG_SUMMARY"
    if [[ -n "$FAILED_STEP" ]]; then
      echo "failed_step=$FAILED_STEP" >> "$LOG_SUMMARY"
    fi
  else
    echo "verify_fk_enforced=$fk_enforced" >> "$LOG_SUMMARY"
    echo "verify_composite_fk=$composite_fk" >> "$LOG_SUMMARY"
    echo "phantom_tenant_cnt=$phantom_cnt" >> "$LOG_SUMMARY"
    echo "phantom_with_memberships=$phantom_with_memberships" >> "$LOG_SUMMARY"
    echo "phantom_with_roles=$phantom_with_roles" >> "$LOG_SUMMARY"
  fi

  echo "run_dir=$RUN_DIR" >> "$LOG_SUMMARY"
}

handle_error() {
  local exit_code=$?
  local line_no=$1
  LAST_ERROR="Script failed at line $line_no (exit code: $exit_code)"

  if [[ -z "$FAILED_STEP" ]]; then
    FAILED_STEP="unknown"
  fi

  write_summary "FAIL" "$LAST_ERROR"
  cat "$LOG_SUMMARY"
  echo "[ERROR] Stage2C-2 replay failed: $LAST_ERROR" >&2
  echo "[ERROR] See logs in: $RUN_DIR" >&2
}

trap 'handle_error $LINENO' ERR

run_psql_in_container () {
  local sql_file="$1"
  if [[ ! -f "$sql_file" ]]; then
    LAST_ERROR="missing sql file: $sql_file"
    FAILED_STEP="preflight_check"
    echo "[ERROR] $LAST_ERROR" >&2
    exit 1
  fi
  echo "[INFO] apply: $(basename "$sql_file")"
  cat "$sql_file" | docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME"
}

# Log initialization info
FAILED_STEP="init"
{
  echo "[INFO] Stage2C-2 replay start: $TS"
  echo "[INFO] db_container=$DB_CONTAINER db_user=$DB_USER db_name=$DB_NAME"
  echo "[INFO] ops_dir=$OPS_DIR"
  echo "[INFO] sql_50=$SQL_50"
  echo "[INFO] sql_99=$SQL_99"
  echo "[INFO] run_dir=$RUN_DIR"
} | tee "$LOG_INIT" >/dev/null

# 1) Run Stage2C-1 replay as baseline
FAILED_STEP="stage2c_1_replay"
(
  echo "[STEP] Stage2C-1 replay baseline"
  bash "$STAGE2C_1"
  echo "[OK] Stage2C-1 replay finished"
) 2>&1 | tee -a "$LOG_INIT" >/dev/null

# 2) Stage2C-2 apply (tenant closure wave1)
FAILED_STEP="apply_tenant_closure"
(
  echo "[STEP] apply tenant closure wave1"
  run_psql_in_container "$SQL_50"
  echo "[OK] apply: $(basename "$SQL_50")"
) 2>&1 | tee "$LOG_APPLY" >/dev/null

# 3) Stage2C-2 verify
FAILED_STEP="verify_tenant_closure"
(
  echo "[STEP] verify tenant closure"
  run_psql_in_container "$SQL_99"
  echo "[OK] apply: $(basename "$SQL_99")"
) 2>&1 | tee "$LOG_VERIFY" >/dev/null

# 4) Parse verification results and generate summary
FAILED_STEP="parse_results"
STAGE2C_2_RESULT="PASS"
FK_ENFORCED="PASS"
COMPOSITE_FK="PASS"
PHANTOM_CNT=0
PHANTOM_WITH_MEMBERSHIPS=0
PHANTOM_WITH_ROLES=0

# Check for general errors in verify log
if grep -Eqi "(^|\s)(ERROR:|FATAL:)" "$LOG_VERIFY"; then
  STAGE2C_2_RESULT="FAIL"
fi

# Check tenant identity FK constraint
if grep -Eq "companies_id_fkey_sys_tenants missing" "$LOG_VERIFY"; then
  FK_ENFORCED="FAIL"
  STAGE2C_2_RESULT="FAIL"
fi

# Check composite FK constraints
if grep -Eq "(inventory_move_lines_move_company_fkey|shipment_lines_ship_company_fkey) missing" "$LOG_VERIFY"; then
  COMPOSITE_FK="FAIL"
  STAGE2C_2_RESULT="FAIL"
fi

# Check negative tests (FK violations should be blocked)
if grep -Eq "FK violation test unexpectedly passed" "$LOG_VERIFY"; then
  COMPOSITE_FK="FAIL"
  STAGE2C_2_RESULT="FAIL"
fi

# Extract WARN fields (phantom tenants) - these don't cause FAIL
if grep -Eq "\[WARN\] phantom_tenant_cnt=" "$LOG_VERIFY"; then
  PHANTOM_CNT=$(grep -oP '\[WARN\] phantom_tenant_cnt=\K\d+' "$LOG_VERIFY" | head -1)
  PHANTOM_WITH_MEMBERSHIPS=$(grep -oP 'phantom_with_memberships=\K\d+' "$LOG_VERIFY" | head -1)
  PHANTOM_WITH_ROLES=$(grep -oP 'phantom_with_roles=\K\d+' "$LOG_VERIFY" | head -1)
fi

# Generate and display summary
write_summary "$STAGE2C_2_RESULT" "" "$FK_ENFORCED" "$COMPOSITE_FK" "$PHANTOM_CNT" "$PHANTOM_WITH_MEMBERSHIPS" "$PHANTOM_WITH_ROLES"
cat "$LOG_SUMMARY"

# Exit with error if verification failed
if [[ "$STAGE2C_2_RESULT" != "PASS" ]]; then
  echo "[ERROR] Stage2C-2 verification failed. See logs in: $RUN_DIR" >&2
  exit 1
fi

echo "[OK] Stage2C-2 replay finished"
echo "[RESULT] stage2c_2=PASS"
