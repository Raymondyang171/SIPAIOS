#!/usr/bin/env bash
set -euo pipefail

# SVC-APP-018: Single-command API restart with route verification
# Usage: ./scripts/dev_restart_api.sh
# Override port: API_PORT=3002 ./scripts/dev_restart_api.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="${ROOT_DIR}/apps/api"
API_PORT="${API_PORT:-3001}"
API_BASE="http://localhost:${API_PORT}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

info() { echo -e "${YELLOW}[INFO]${NC} $1"; }
ok() { echo -e "${GREEN}[OK]${NC}   $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }
die() { fail "$1"; exit 1; }

# ---- Step 1: Stop existing API process ----
info "Stopping existing API on port ${API_PORT}..."

# Method 1: Find PID by port (precise)
PID_BY_PORT=$(lsof -ti:"${API_PORT}" 2>/dev/null || true)
if [[ -n "$PID_BY_PORT" ]]; then
  info "Found process on port ${API_PORT}: PID ${PID_BY_PORT}"
  kill "$PID_BY_PORT" 2>/dev/null || true
  sleep 1
  # Force kill if still running
  if kill -0 "$PID_BY_PORT" 2>/dev/null; then
    kill -9 "$PID_BY_PORT" 2>/dev/null || true
  fi
  ok "Stopped process ${PID_BY_PORT}"
else
  # Method 2: Fallback - find by command pattern
  FALLBACK_PID=$(pgrep -f "node.*src/index.js" 2>/dev/null || true)
  if [[ -n "$FALLBACK_PID" ]]; then
    info "Found API process by pattern: PID ${FALLBACK_PID}"
    kill "$FALLBACK_PID" 2>/dev/null || true
    sleep 1
    ok "Stopped process ${FALLBACK_PID}"
  else
    info "No existing API process found"
  fi
fi

# Verify port is free
sleep 1
if lsof -ti:"${API_PORT}" >/dev/null 2>&1; then
  die "Port ${API_PORT} still in use after stop attempt"
fi
ok "Port ${API_PORT} is free"

# ---- Step 2: Start API server ----
info "Starting API server on port ${API_PORT}..."

cd "$API_DIR"

# Export PORT for the API to use
export PORT="${API_PORT}"

# Start in background, redirect output to log file
LOG_FILE="${ROOT_DIR}/artifacts/api-dev.log"
mkdir -p "$(dirname "$LOG_FILE")"
nohup npm run start > "$LOG_FILE" 2>&1 &
API_PID=$!

info "API started with PID ${API_PID}, waiting for ready..."

# Wait for API to be ready (max 30 seconds - allow more time after full replay)
MAX_WAIT=30
WAIT_COUNT=0
while [[ $WAIT_COUNT -lt $MAX_WAIT ]]; do
  if curl -s "${API_BASE}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
  WAIT_COUNT=$((WAIT_COUNT + 1))
done

if [[ $WAIT_COUNT -ge $MAX_WAIT ]]; then
  fail "API did not start within ${MAX_WAIT} seconds"
  info "Check log: ${LOG_FILE}"
  tail -20 "$LOG_FILE" 2>/dev/null || true
  exit 1
fi

ok "API server started (PID: ${API_PID})"

# ---- Step 3: Verify routes ----
echo ""
info "Verifying API routes..."

VERIFY_PASSED=0
VERIFY_TOTAL=2

# Test 1: /health
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${API_BASE}/health" 2>/dev/null || echo "000")
if [[ "$HEALTH_RESPONSE" == "200" ]]; then
  ok "GET /health → ${HEALTH_RESPONSE}"
  VERIFY_PASSED=$((VERIFY_PASSED + 1))
else
  fail "GET /health → ${HEALTH_RESPONSE} (expected 200)"
fi

# Test 2: POST /uoms (expect 401 AUTH_REQUIRED, not 404)
UOMS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${API_BASE}/uoms" -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")
if [[ "$UOMS_RESPONSE" != "404" && "$UOMS_RESPONSE" != "000" ]]; then
  ok "POST /uoms → ${UOMS_RESPONSE} (route exists)"
  VERIFY_PASSED=$((VERIFY_PASSED + 1))
else
  fail "POST /uoms → ${UOMS_RESPONSE} (route missing!)"
fi

# ---- Summary ----
echo ""
echo "========================================"
if [[ $VERIFY_PASSED -eq $VERIFY_TOTAL ]]; then
  ok "API ready: ${API_BASE}"
  ok "Verification: ${VERIFY_PASSED}/${VERIFY_TOTAL} passed"
  echo "========================================"
  echo ""
  info "Log file: ${LOG_FILE}"
  info "To stop: kill ${API_PID}"
  exit 0
else
  fail "Verification: ${VERIFY_PASSED}/${VERIFY_TOTAL} passed"
  echo "========================================"
  echo ""
  info "Log file: ${LOG_FILE}"
  exit 1
fi
