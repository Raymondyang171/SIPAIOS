#!/usr/bin/env bash
set -euo pipefail

# Restore helper (OPTIONAL): restore a pg_dump custom file into the running Postgres container.
# WARNING: This will overwrite objects in target DB if you drop/recreate manually.
# This script only performs pg_restore into an existing empty DB.

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <path-to-.dump>" >&2
  exit 2
fi

DUMP_PATH="$1"
DB_CONT="sipaios-postgres"
DB_USER="sipaios"
DB_NAME="sipaios"

if [[ ! -f "$DUMP_PATH" ]]; then
  echo "[ERROR] dump not found: $DUMP_PATH" >&2
  exit 2
fi

echo "[INFO] restoring dump into $DB_CONT/$DB_NAME ..."
cat "$DUMP_PATH" | docker exec -i "$DB_CONT" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists

echo "[DONE] restore completed."
