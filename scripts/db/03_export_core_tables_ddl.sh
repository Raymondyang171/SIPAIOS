#!/usr/bin/env bash
set -euo pipefail

# Export core tables DDL (schema-only) for Phase 1 v1.1
# Runs pg_dump inside docker container `sipaios-postgres`.

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUTDIR="$ROOT/artifacts/inspects/phase1_v1.1"
DDL="$OUTDIR/core_tables_ddl.sql"
SHA="$OUTDIR/core_tables_ddl.sql.sha256"
LOG="$OUTDIR/core_tables_ddl.export.log"

mkdir -p "$OUTDIR"
: > "$LOG"

{
  echo "== Phase1 DDL Export =="
  echo "Time: $(date -Iseconds)"
  echo "Root: $ROOT"
  echo "Out:  $OUTDIR"
  echo
  echo "[1/3] Check pg_dump availability in container..."
} | tee -a "$LOG"

if ! docker exec sipaios-postgres pg_dump --version >>"$LOG" 2>&1; then
  {
    echo
    echo "ERROR: pg_dump not found or container unreachable."
    echo "- Check container name: docker ps (look for sipaios-postgres)"
    echo "- If name differs, edit this script: docker exec <name> ..."
  } | tee -a "$LOG"
  exit 1
fi

{
  echo
  echo "[2/3] Export schema-only DDL for core tables..."
} | tee -a "$LOG"

# NOTE: stdout -> DDL file, stderr -> LOG
if ! docker exec -i sipaios-postgres pg_dump -U sipaios -d sipaios \
  --schema-only --no-owner --no-privileges \
  --table=public.companies \
  --table=public.sites \
  --table=public.warehouses \
  --table=public.uoms \
  --table=public.items \
  --table=public.customers \
  --table=public.sales_orders \
  --table=public.sales_order_lines \
  --table=public.work_centers \
  --table=public.work_orders \
  --table=public.inventory_moves \
  --table=public.inventory_move_lines \
  1>"$DDL" 2>>"$LOG"; then
  {
    echo
    echo "ERROR: pg_dump failed. See log: $LOG"
  } | tee -a "$LOG"
  exit 2
fi

{
  echo
  echo "[3/3] Sanity check + sha256..."
} | tee -a "$LOG"

if [ ! -s "$DDL" ]; then
  {
    echo "ERROR: DDL file is empty: $DDL"
    echo "Likely causes: wrong DB/user, table name mismatch, pg_dump errors (see log)."
  } | tee -a "$LOG"
  exit 3
fi

sha256sum "$DDL" | tee "$SHA" | tee -a "$LOG" >/dev/null

{
  echo
  echo "DONE"
  echo "- DDL: $DDL"
  echo "- SHA: $SHA"
  echo "- LOG: $LOG"
} | tee -a "$LOG"
