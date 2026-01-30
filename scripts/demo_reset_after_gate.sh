#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DB_CONTAINER="${DB_CONTAINER:-sipaios-postgres}"
DB_NAME="${DB_NAME:-sipaios}"
DB_USER="${DB_USER:-sipaios}"

SQL_FILES=(
  "${ROOT_DIR}/apps/api/seeds/004_backflush_data.sql"
  "${ROOT_DIR}/apps/api/seeds/005_purchase_ui_items_type_fix.sql"
  "${ROOT_DIR}/apps/api/seeds/007_purchase_ui_uoms_company_fix.sql"
)

info() { echo "[INFO] $1"; }
ok() { echo "[OK]   $1"; }
die() { echo "[ERROR] $1" >&2; exit 1; }

info "Preflight: checking docker container '$DB_CONTAINER'"
if ! docker inspect "$DB_CONTAINER" >/dev/null 2>&1; then
  die "Container '$DB_CONTAINER' not found. Set DB_CONTAINER or start the DB container."
fi

running="$(docker inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null || true)"
if [ "$running" != "true" ]; then
  die "Container '$DB_CONTAINER' is not running. Start it and retry."
fi
ok "Container '$DB_CONTAINER' is running"

info "Preflight: checking SQL files"
missing_files=()
for file in "${SQL_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    missing_files+=("$file")
  fi
done
if [ ${#missing_files[@]} -ne 0 ]; then
  die "Missing SQL file(s): ${missing_files[*]}"
fi
ok "All SQL files are present"

for file in "${SQL_FILES[@]}"; do
  info "Importing seed: $file"
  docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME" < "$file"
  ok "Imported: $file"
done

ok "Demo reset after gate completed"
info "Next steps:"
echo " - ./scripts/gate_app02.sh"
echo " - (if already logged in) open /purchase/orders/create to verify Items/UOM dropdowns"
