#!/usr/bin/env bash
set -euo pipefail

# SVC-APP-021C: Demo Smoke Test for Master Data
# Validates: /health, /login, /suppliers, /uoms, /items
# Requirements: curl, bash, python3 (or grep fallback)
# Exit 0 = PASS, Exit 1 = FAIL

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
API_BASE="${API_BASE_URL:-http://localhost:3001}"
TEST_EMAIL="${TEST_EMAIL:-admin@demo.local}"
TEST_PASSWORD="${TEST_PASSWORD:-Test@123}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${YELLOW}[INFO]${NC}  $1" >&2; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1" >&2; }
fail()  { echo -e "${RED}[FAIL]${NC}  $1" >&2; }
header() { echo -e "${CYAN}$1${NC}" >&2; }

# Track results
TESTS_PASSED=0
TESTS_TOTAL=0
RESULTS=()

check_endpoint() {
  local name="$1"
  local method="$2"
  local url="$3"
  local token="${4:-}"
  local expect_count="${5:-false}"

  TESTS_TOTAL=$((TESTS_TOTAL + 1))

  local curl_opts=(-s -w "\n%{http_code}")
  [[ -n "$token" ]] && curl_opts+=(-H "Authorization: Bearer $token")

  if [[ "$method" == "POST" ]]; then
    curl_opts+=(-X POST -H "Content-Type: application/json")
    if [[ "$url" == *"/login"* ]]; then
      curl_opts+=(-d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
    fi
  fi

  local response
  response=$(curl "${curl_opts[@]}" "$url" 2>/dev/null || echo -e "\n000")

  local body http_code
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  if [[ "$http_code" == "200" ]]; then
    local count_info=""
    if [[ "$expect_count" == "true" ]]; then
      # Try python3 first, fallback to grep
      local count
      if command -v python3 &>/dev/null; then
        # Handle various response formats: array, or object with data/items/suppliers/uoms key
        count=$(echo "$body" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if isinstance(d,list):
    print(len(d))
else:
    # Try common keys for wrapped arrays
    for key in ['data','items','suppliers','uoms','companies']:
        if key in d and isinstance(d[key],list):
            print(len(d[key]))
            break
    else:
        print(d.get('count',0))
" 2>/dev/null || echo "?")
      else
        # Fallback: count array elements by counting '{"id"' occurrences
        count=$(echo "$body" | grep -o '"id"' | wc -l || echo "?")
      fi

      if [[ "$count" == "0" ]]; then
        fail "$name → $http_code (count=0, EMPTY DATA)"
        RESULTS+=("$name|$http_code|FAIL|count=0")
        return 1
      fi
      count_info=" (count=$count)"
    fi

    ok "$name → $http_code$count_info"
    RESULTS+=("$name|$http_code|PASS|$count_info")
    TESTS_PASSED=$((TESTS_PASSED + 1))

    # Return token for login
    if [[ "$url" == *"/login"* ]]; then
      if command -v python3 &>/dev/null; then
        echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null || true
      else
        echo "$body" | grep -o '"token":"[^"]*"' | sed 's/"token":"//;s/"$//' || true
      fi
    fi
    return 0
  else
    fail "$name → $http_code"
    RESULTS+=("$name|$http_code|FAIL|")
    return 1
  fi
}

# ============================================================
header "=== SVC-APP-021C: Demo Smoke Test ==="
echo "API Base: $API_BASE" >&2
echo "Test User: $TEST_EMAIL" >&2
echo "" >&2

# ---- Test 1: Health Check ----
header "[1/5] Health Check"
check_endpoint "GET /health" "GET" "$API_BASE/health" || true

# ---- Test 2: Login ----
header "[2/5] Login"
TOKEN=""
TOKEN=$(check_endpoint "POST /login" "POST" "$API_BASE/login" "" "false") || true

if [[ -z "$TOKEN" || "$TOKEN" == "000" ]]; then
  fail "Login failed - cannot continue smoke test"
  echo ""
  echo "=== SMOKE TEST SUMMARY ==="
  echo "Result: FAIL (Login blocked)"
  echo "Passed: $TESTS_PASSED / $TESTS_TOTAL"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Check API is running: curl $API_BASE/health"
  echo "  2. Check seeds executed: make reset"
  echo "  3. Check credentials: $TEST_EMAIL / $TEST_PASSWORD"
  exit 1
fi

info "Token acquired (${#TOKEN} chars)"

# ---- Test 3-5: Master Data Endpoints ----
header "[3/5] Suppliers"
check_endpoint "GET /suppliers" "GET" "$API_BASE/suppliers" "$TOKEN" "true" || true

header "[4/5] UOMs"
check_endpoint "GET /uoms" "GET" "$API_BASE/uoms" "$TOKEN" "true" || true

header "[5/5] Items"
check_endpoint "GET /items" "GET" "$API_BASE/items" "$TOKEN" "true" || true

# ============================================================
# Summary
echo ""
echo "========================================"
header "=== SMOKE TEST SUMMARY ==="
echo "========================================"
echo ""

printf "%-20s %-10s %-10s %s\n" "Endpoint" "Status" "Result" "Info"
printf "%-20s %-10s %-10s %s\n" "--------" "------" "------" "----"
for r in "${RESULTS[@]}"; do
  IFS='|' read -r name code result info <<< "$r"
  printf "%-20s %-10s %-10s %s\n" "$name" "$code" "$result" "$info"
done

echo ""
echo "Passed: $TESTS_PASSED / $TESTS_TOTAL"
echo ""

if [[ $TESTS_PASSED -eq $TESTS_TOTAL ]]; then
  echo -e "${GREEN}[SMOKE PASS]${NC} All endpoints OK, Master Data non-empty"
  exit 0
else
  echo -e "${RED}[SMOKE FAIL]${NC} Some checks failed"
  echo ""
  echo "Troubleshooting:"
  echo "  1. Run: make reset (full DB replay)"
  echo "  2. Run: ./scripts/dev_restart_api.sh (restart API)"
  echo "  3. Check: artifacts/api-dev.log"
  exit 1
fi
