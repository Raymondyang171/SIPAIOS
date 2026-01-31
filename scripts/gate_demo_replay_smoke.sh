#!/usr/bin/env bash
set -euo pipefail

# SVC-APP-021C: Demo Replay + Smoke Test Gate
# One-click entry: gate_app02 → dev_restart_api → smoke_master_data
# Exit 0 = PASS (idempotent, can run repeatedly)

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Scripts
GATE_APP02="${ROOT_DIR}/scripts/gate_app02.sh"
DEV_RESTART="${ROOT_DIR}/scripts/dev_restart_api.sh"
SMOKE_TEST="${ROOT_DIR}/scripts/smoke/demo_smoke_master_data.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()   { echo -e "${YELLOW}[INFO]${NC}  $1"; }
ok()     { echo -e "${GREEN}[OK]${NC}    $1"; }
fail()   { echo -e "${RED}[FAIL]${NC}  $1"; }
header() { echo -e "${CYAN}$1${NC}"; }

die() {
  fail "$1"
  echo ""
  echo "=== GATE FAILED ==="
  echo "Step: $CURRENT_STEP"
  echo "Exit Code: $2"
  echo ""
  echo "Troubleshooting:"
  echo "  - Check logs in artifacts/gate/app02/"
  echo "  - Check API log: artifacts/api-dev.log"
  exit 1
}

timestamp_now() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

# ============================================================
CURRENT_STEP=""
GATE_START=$(date +%s)

header "============================================================"
header "  SVC-APP-021C: Demo Replay + Smoke Test Gate"
header "============================================================"
echo ""
echo "Start Time: $(timestamp_now)"
echo "Root Dir:   $ROOT_DIR"
echo ""

# ---- Step 1: APP-02 Gate (DB Replay + Seed + Newman) ----
CURRENT_STEP="1/3 APP-02 Gate (DB Replay + Seed)"
header "[$CURRENT_STEP]"
echo ""

if [[ ! -x "$GATE_APP02" ]]; then
  die "gate_app02.sh not found or not executable" 1
fi

set +e
bash "$GATE_APP02"
GATE_EXIT=$?
set -e

if [[ $GATE_EXIT -ne 0 ]]; then
  die "gate_app02.sh failed" $GATE_EXIT
fi
ok "APP-02 Gate passed"
echo ""

# ---- Step 2: Restart API (ensure fresh process) ----
CURRENT_STEP="2/3 Restart API"
header "[$CURRENT_STEP]"
echo ""

if [[ ! -x "$DEV_RESTART" ]]; then
  die "dev_restart_api.sh not found or not executable" 1
fi

set +e
bash "$DEV_RESTART"
RESTART_EXIT=$?
set -e

if [[ $RESTART_EXIT -ne 0 ]]; then
  die "dev_restart_api.sh failed" $RESTART_EXIT
fi
ok "API restarted successfully"
echo ""

# ---- Step 3: Smoke Test (Master Data Validation) ----
CURRENT_STEP="3/3 Smoke Test"
header "[$CURRENT_STEP]"
echo ""

if [[ ! -x "$SMOKE_TEST" ]]; then
  die "demo_smoke_master_data.sh not found or not executable" 1
fi

set +e
bash "$SMOKE_TEST"
SMOKE_EXIT=$?
set -e

if [[ $SMOKE_EXIT -ne 0 ]]; then
  die "Smoke test failed" $SMOKE_EXIT
fi
ok "Smoke test passed"
echo ""

# ============================================================
# Final Summary
GATE_END=$(date +%s)
GATE_DURATION=$((GATE_END - GATE_START))

header "============================================================"
header "  GATE SUMMARY"
header "============================================================"
echo ""
echo "Duration:    ${GATE_DURATION}s"
echo "End Time:    $(timestamp_now)"
echo ""
echo "Steps Completed:"
echo "  [1/3] APP-02 Gate (DB Replay + Seed + Newman) ... PASS"
echo "  [2/3] Restart API ................................. PASS"
echo "  [3/3] Smoke Test (Master Data) ................... PASS"
echo ""
echo "Endpoints Verified:"
echo "  - /health         200"
echo "  - /login          200 (token acquired)"
echo "  - /suppliers      200 (count > 0)"
echo "  - /uoms           200 (count > 0)"
echo "  - /items          200 (count > 0)"
echo ""
echo -e "${GREEN}[GATE PASS]${NC} Demo environment ready for use"
echo ""
echo "Next Steps:"
echo "  - Open http://localhost:3000 (Web UI)"
echo "  - API available at http://localhost:3001"
echo ""

exit 0
