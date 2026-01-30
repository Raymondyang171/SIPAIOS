#!/usr/bin/env bash
set -euo pipefail

# APP-02/03/04 Gate (Purchase Loop + Production MO + Backflush)
# One-click: DB replay → seed → Newman Gate
# Exit 0 only if all steps pass (Gatekeeper behavior)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DB_CONTAINER="${DB_CONTAINER:-sipaios-postgres}"
DB_NAME="${DB_NAME:-sipaios}"
DB_USER="${DB_USER:-sipaios}"
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"

STAGE2C="${ROOT_DIR}/scripts/db/02_replay_stage2c_company_scope_v1_0.sh"
SEED_AUTH="${ROOT_DIR}/apps/api/seeds/001_auth_test_users.sql"
SEED_PURCHASE="${ROOT_DIR}/apps/api/seeds/002_purchase_test_data.sql"
SEED_MO="${ROOT_DIR}/apps/api/seeds/003_production_mo_data.sql"
SEED_BACKFLUSH="${ROOT_DIR}/apps/api/seeds/004_backflush_data.sql"

timestamp_now() {
  date -u +"%Y%m%dT%H%M%SZ"
}

die() {
  echo "[ERROR] $*" >&2
  exit 1
}

run_psql_in_container() {
  local sql_file="$1"
  if [[ ! -f "$sql_file" ]]; then
    die "SQL file not found: $sql_file"
  fi
  echo "[INFO] seed: $(basename "$sql_file")"
  cat "$sql_file" | docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME"
}

# Setup artifacts directory (use absolute path to avoid cd issues)
TS="$(timestamp_now)"
RUN_DIR="${ROOT_DIR}/artifacts/gate/app02/$TS"
mkdir -p "$RUN_DIR"

LOG_REPLAY="$RUN_DIR/01_replay.log"
LOG_SEED="$RUN_DIR/02_seed.log"
LOG_NEWMAN="$RUN_DIR/03_newman.log"
LOG_SUMMARY="$RUN_DIR/04_summary.txt"

echo "=== APP-02 GATE START: $TS ==="
echo "[INFO] run_dir=$RUN_DIR"

# ---- Step 1: DB Replay (Stage2C includes Stage2B and Stage2A) ----
echo ""
echo "[STEP 1/3] DB Replay (Phase1 → Stage2B RBAC → Stage2C Company Scope)"
if ! bash "$STAGE2C" 2>&1 | tee "$LOG_REPLAY"; then
  echo "[GATE FAIL] DB replay failed" | tee -a "$LOG_SUMMARY"
  exit 1
fi
echo "[OK] DB replay completed"

# ---- Step 2: APP-02/03/04 Seeds ----
echo ""
echo "[STEP 2/3] APP-02/03/04 Seeds"
{
  run_psql_in_container "$SEED_AUTH"
  run_psql_in_container "$SEED_PURCHASE"
  run_psql_in_container "$SEED_MO"
  run_psql_in_container "$SEED_BACKFLUSH"
} 2>&1 | tee "$LOG_SEED"
echo "[OK] Seeds completed"

# ---- Step 3: Newman Gate ----
echo ""
echo "[STEP 3/3] Newman Gate"

# Safety: ensure RUN_DIR exists before writing artifacts
mkdir -p "$RUN_DIR" || die "artifact write failed: cannot create $RUN_DIR"

# Pre-check: ensure we can write to LOG_NEWMAN
if ! touch "$LOG_NEWMAN" 2>/dev/null; then
  echo "[ERROR] artifact write failed: cannot write to $LOG_NEWMAN" >&2
  exit 1
fi

# Check npm availability
if ! command -v npm &> /dev/null; then
  die "npm not found. Please install Node.js"
fi

NEWMAN_RESULT_JSON="$RUN_DIR/newman-results.json"

# Run newman via npm script (uses local dependency, not global)
# stdout/stderr go to log file; use tee only for console echo after
set +e
npm --prefix "$ROOT_DIR/apps/api" run test:newman -- \
  --reporters cli,json \
  --reporter-json-export "$NEWMAN_RESULT_JSON" \
  > "$LOG_NEWMAN" 2>&1
NEWMAN_EXIT=$?
set -e

# Show newman output to console
cat "$LOG_NEWMAN"

# Verify artifacts were written
if [[ ! -f "$LOG_NEWMAN" ]]; then
  echo "[ERROR] artifact write failed: $LOG_NEWMAN not created" >&2
  exit 1
fi

# ---- Summary ----
echo ""
echo "=== APP-02 GATE SUMMARY ===" | tee "$LOG_SUMMARY"
echo "timestamp_utc=$TS" | tee -a "$LOG_SUMMARY"
echo "db_container=$DB_CONTAINER" | tee -a "$LOG_SUMMARY"
echo "run_dir=$RUN_DIR" | tee -a "$LOG_SUMMARY"

if [[ $NEWMAN_EXIT -eq 0 ]]; then
  echo "newman_gate=PASS" | tee -a "$LOG_SUMMARY"
  echo "gate_result=PASS" | tee -a "$LOG_SUMMARY"
  echo ""
  echo "[GATE PASS] APP-02 Purchase Loop gate passed"

  # SVC-OPS-013: Sync snapshot to artifacts (non-blocking)
  SYNC_SCRIPT="$ROOT_DIR/scripts/sync_snapshot_to_artifacts.sh"
  if [[ -x "$SYNC_SCRIPT" ]]; then
    echo ""
    echo "[POST-GATE] Syncing snapshot to artifacts..."
    bash "$SYNC_SCRIPT" || true
  fi

  exit 0
else
  echo "newman_gate=FAIL" | tee -a "$LOG_SUMMARY"
  echo "gate_result=FAIL" | tee -a "$LOG_SUMMARY"
  echo ""
  echo "[GATE FAIL] Newman tests failed (exit code: $NEWMAN_EXIT)"
  echo "[INFO] See detailed results: $NEWMAN_RESULT_JSON"
  exit 1
fi
