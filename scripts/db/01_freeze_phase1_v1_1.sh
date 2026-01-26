#!/usr/bin/env bash
set -euo pipefail

# Freeze Baseline: Phase 1 schema v1.1
# - Runs verify outputs (99 + 10 + optional 11)
# - Takes a pg_dump (custom format) from the running dockerized Postgres
# - Writes everything into artifacts/baselines/<timestamp>/

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TS="$(date +%Y%m%d_%H%M%S)"
OUT_DIR="$REPO_ROOT/artifacts/baselines/phase1_v1.1/$TS"
DB_CONT="sipaios-postgres"
DB_USER="sipaios"
DB_NAME="sipaios"

mkdir -p "$OUT_DIR"

run_verify() {
  local label="$1"; shift
  local sql_path="$1"; shift
  local out="$OUT_DIR/${label}.txt"
  if [[ ! -f "$REPO_ROOT/$sql_path" ]]; then
    echo "[ERROR] missing SQL file: $REPO_ROOT/$sql_path" >&2
    exit 2
  fi
  echo "[INFO] running $label ..."
  docker exec -i "$DB_CONT" psql -U "$DB_USER" -d "$DB_NAME" < "$REPO_ROOT/$sql_path" > "$out"
  echo "[OK] $label -> $out"
}

run_dump() {
  local dump="$OUT_DIR/sipaios_phase1_v1.1_${TS}.dump"
  echo "[INFO] taking pg_dump (custom) ..."
  docker exec "$DB_CONT" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc > "$dump"
  sha256sum "$dump" > "$dump.sha256"
  echo "[OK] dump -> $dump"
}

write_manifest() {
  local mf="$OUT_DIR/MANIFEST.md"
  {
    echo "# Phase 1 Baseline Manifest"
    echo
    echo "- Timestamp: $TS"
    echo "- DB container: $DB_CONT"
    echo "- DB: $DB_NAME (user: $DB_USER)"
    echo "- Includes: verify outputs + pg_dump (custom)"
    echo
    echo "## Files"
    echo "- verify_99.txt"
    echo "- verify_10_sys.txt"
    echo "- verify_11_smoke.txt (optional, if present)"
    echo "- sipaios_phase1_v1.1_${TS}.dump (+ .sha256)"
  } > "$mf"
}

# Always run
run_verify "verify_99" "phase1_schema_v1.1_sql/supabase/ops/20260126_99_phase1_verify.sql"
run_verify "verify_10_sys" "phase1_schema_v1.1_sql/supabase/ops/20260126_10_phase1_verify_sys.sql"

# Optional smoke
if [[ -f "$REPO_ROOT/phase1_schema_v1.1_sql/supabase/ops/20260126_11_phase1_smoke_readonly.sql" ]]; then
  run_verify "verify_11_smoke" "phase1_schema_v1.1_sql/supabase/ops/20260126_11_phase1_smoke_readonly.sql"
fi

run_dump
write_manifest

echo "[DONE] Baseline frozen at: $OUT_DIR"
