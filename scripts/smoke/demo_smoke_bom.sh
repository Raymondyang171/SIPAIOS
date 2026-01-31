#!/usr/bin/env bash
set -euo pipefail

# SVC-APP-020A: Demo Smoke Test for BOM -> MO linkage
# Validates: /login, /items, /sites, /warehouses, /boms, /work-orders
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

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "Missing required command: $1"
    exit 1
  fi
}

require_cmd curl
require_cmd python3

json_select() {
  local script="$1"
  python3 -c '
import json
import sys

payload = json.load(sys.stdin)
script = sys.argv[1]

def first_item(data):
    if isinstance(data, list) and data:
        return data[0]
    if isinstance(data, dict):
        for key in ("items", "sites", "warehouses", "boms"):
            value = data.get(key)
            if isinstance(value, list) and value:
                return value[0]
    return None

def first_two_items(data):
    if isinstance(data, list):
        return data[:2]
    if isinstance(data, dict):
        for key in ("items",):
            value = data.get(key)
            if isinstance(value, list):
                return value[:2]
    return []

if script == "first_item":
    item = first_item(payload)
    print(json.dumps(item) if item else "")
elif script == "first_two_items":
    items = first_two_items(payload)
    print(json.dumps(items))
else:
    print("")
' "$script"
}

header "=== SVC-APP-020A: BOM -> MO Smoke Test ==="
echo "API Base: $API_BASE" >&2
echo "Test User: $TEST_EMAIL" >&2
echo "" >&2

info "Login"
login_resp=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
login_code=$(echo "$login_resp" | tail -n1)
login_body=$(echo "$login_resp" | sed '$d')

if [[ "$login_code" != "200" ]]; then
  fail "Login failed ($login_code)"
  echo "$login_body" >&2
  exit 1
fi

TOKEN=$(echo "$login_body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")
if [[ -z "$TOKEN" ]]; then
  fail "Login response missing token"
  exit 1
fi
ok "Token acquired"

info "Fetch parent item (fg)"
items_fg_resp=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE/items?type=fg")
items_fg_code=$(echo "$items_fg_resp" | tail -n1)
items_fg_body=$(echo "$items_fg_resp" | sed '$d')

if [[ "$items_fg_code" != "200" ]]; then
  fail "Items fg fetch failed ($items_fg_code)"
  echo "$items_fg_body" >&2
  exit 1
fi

parent_item=$(echo "$items_fg_body" | json_select "first_item")
if [[ -z "$parent_item" ]]; then
  info "No fg items, fallback to any item"
  items_any_body=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/items")
  parent_item=$(echo "$items_any_body" | json_select "first_item")
fi

PARENT_ITEM_ID=$(echo "$parent_item" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))")
PARENT_UOM_ID=$(echo "$parent_item" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('base_uom_id',''))")
if [[ -z "$PARENT_ITEM_ID" || -z "$PARENT_UOM_ID" ]]; then
  fail "Parent item missing id or base_uom_id"
  exit 1
fi
ok "Parent item selected"

info "Fetch child items (raw/material)"
items_raw_resp=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE/items?type=raw")
items_raw_code=$(echo "$items_raw_resp" | tail -n1)
items_raw_body=$(echo "$items_raw_resp" | sed '$d')

if [[ "$items_raw_code" != "200" ]]; then
  fail "Items raw fetch failed ($items_raw_code)"
  echo "$items_raw_body" >&2
  exit 1
fi

child_items=$(echo "$items_raw_body" | json_select "first_two_items")
child_count=$(echo "$child_items" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
if [[ "$child_count" -lt 1 ]]; then
  info "No raw items, fallback to any items"
  items_any_body=$(curl -s -H "Authorization: Bearer $TOKEN" "$API_BASE/items")
  child_items=$(echo "$items_any_body" | json_select "first_two_items")
fi

CHILD_IDS=($(echo "$child_items" | python3 -c "import sys,json; data=json.load(sys.stdin); print(' '.join([d.get('id','') for d in data if d.get('id')]))"))
if [[ "${#CHILD_IDS[@]}" -lt 1 ]]; then
  fail "No child items available"
  exit 1
fi
ok "Child items selected"

info "Fetch site and warehouse"
sites_resp=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE/sites")
sites_code=$(echo "$sites_resp" | tail -n1)
sites_body=$(echo "$sites_resp" | sed '$d')
if [[ "$sites_code" != "200" ]]; then
  fail "Sites fetch failed ($sites_code)"
  echo "$sites_body" >&2
  exit 1
fi

site=$(echo "$sites_body" | json_select "first_item")
SITE_ID=$(echo "$site" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))")
if [[ -z "$SITE_ID" ]]; then
  fail "No site id available"
  exit 1
fi

ware_resp=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" "$API_BASE/warehouses?site_id=$SITE_ID")
ware_code=$(echo "$ware_resp" | tail -n1)
ware_body=$(echo "$ware_resp" | sed '$d')
if [[ "$ware_code" != "200" ]]; then
  fail "Warehouses fetch failed ($ware_code)"
  echo "$ware_body" >&2
  exit 1
fi

warehouse=$(echo "$ware_body" | json_select "first_item")
WAREHOUSE_ID=$(echo "$warehouse" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('id',''))")
if [[ -z "$WAREHOUSE_ID" ]]; then
  fail "No warehouse id available"
  exit 1
fi
ok "Site + warehouse selected"

info "Create BOM v1"
IDEMPOTENCY_KEY="bom-$(date +%s)"

CHILD_IDS_STR="${CHILD_IDS[*]}"
line_payload=$(CHILD_IDS_STR="$CHILD_IDS_STR" python3 - <<'PY'
import json
import os

raw = os.environ.get("CHILD_IDS_STR", "")
ids = [entry for entry in raw.split() if entry]
lines = []
for cid in ids[:2]:
    lines.append({"child_item_id": cid, "qty": "1"})
print(json.dumps(lines))
PY
)

if [[ -z "$line_payload" || "$line_payload" == "[]" ]]; then
  fail "Failed to build BOM lines"
  exit 1
fi

bom_payload=$(python3 - <<PY
import json
lines = json.loads('''$line_payload''')
print(json.dumps({
  "parent_item_id": "$PARENT_ITEM_ID",
  "lines": lines
}))
PY
)

bom_resp=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -H "Idempotency-Key: $IDEMPOTENCY_KEY" \
  -X POST "$API_BASE/boms" -d "$bom_payload")
bom_code=$(echo "$bom_resp" | tail -n1)
bom_body=$(echo "$bom_resp" | sed '$d')
if [[ "$bom_code" != "201" ]]; then
  fail "Create BOM failed ($bom_code)"
  echo "$bom_body" >&2
  exit 1
fi

BOM_VERSION_ID=$(echo "$bom_body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('bom_version_id',''))")
if [[ -z "$BOM_VERSION_ID" ]]; then
  fail "BOM response missing bom_version_id"
  exit 1
fi
ok "BOM created (version id acquired)"

info "Create MO referencing BOM version"
mo_payload=$(python3 - <<PY
import json
print(json.dumps({
  "site_id": "$SITE_ID",
  "item_id": "$PARENT_ITEM_ID",
  "planned_qty": 1,
  "uom_id": "$PARENT_UOM_ID",
  "bom_version_id": "$BOM_VERSION_ID",
  "primary_warehouse_id": "$WAREHOUSE_ID"
}))
PY
)

mo_resp=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -X POST "$API_BASE/work-orders" -d "$mo_payload")
mo_code=$(echo "$mo_resp" | tail -n1)
mo_body=$(echo "$mo_resp" | sed '$d')
if [[ "$mo_code" != "201" ]]; then
  fail "Create MO failed ($mo_code)"
  echo "$mo_body" >&2
  exit 1
fi

MO_BOM_VERSION_ID=$(echo "$mo_body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('bom_version_id',''))")
if [[ "$MO_BOM_VERSION_ID" != "$BOM_VERSION_ID" ]]; then
  fail "bom_version_id mismatch: MO=$MO_BOM_VERSION_ID BOM=$BOM_VERSION_ID"
  exit 1
fi
ok "MO references BOM version"

echo ""
ok "SVC-APP-020A BOM smoke test PASS"
exit 0
