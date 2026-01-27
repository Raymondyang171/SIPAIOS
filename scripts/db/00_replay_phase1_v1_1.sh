#!/usr/bin/env bash
set -euo pipefail

# Stage 2A - Single entry replay pipeline for Phase1 v1.1
# - restore baseline -> seed min_e2e -> verify -> summary
# Redlines:
# - No secrets printed or stored
# - All outputs go under artifacts/ (expected to be gitignored)

# ---- Config (override via env) ----
DB_CONTAINER="${DB_CONTAINER:-sipaios-postgres}"
DB_USER="${DB_USER:-sipaios}"
DB_NAME="${DB_NAME:-sipaios}"

RESTORE_SCRIPT="${RESTORE_SCRIPT:-./scripts/db/08_restore_latest_phase1_baseline.sh}"

# Candidate locations (script will pick the first existing path)
CANDIDATE_OPS_DIRS=(
  "${PHASE1_OPS_DIR:-phase1_schema_v1.1_sql/supabase/ops}"
  "supabase/ops"
  "phase1_schema_v1.1_sql/ops"
)

CANDIDATE_SEED_SQLS=(
  "${PHASE1_SEED_SQL:-supabase/ops/20260127_12_phase1_seed_min_e2e.sql}"
  "phase1_schema_v1.1_sql/supabase/ops/20260127_12_phase1_seed_min_e2e.sql"
  "supabase/ops/20260127_12_phase1_seed_min_e2e.sql"
)

CANDIDATE_SEED_VERIFY_SQLS=(
  "${PHASE1_SEED_VERIFY_SQL:-supabase/ops/20260127_13_phase1_verify_min_e2e.sql}"
  "phase1_schema_v1.1_sql/supabase/ops/20260127_13_phase1_verify_min_e2e.sql"
  "supabase/ops/20260127_13_phase1_verify_min_e2e.sql"
)

# Phase1 verify SQL is usually in ops directory
PHASE1_VERIFY_SQL_NAME="${PHASE1_VERIFY_SQL_NAME:-99_phase1_verify.sql}"

# "core tables" definition (stable & documented):
# public tables excluding system-ish prefixes & migration tables.
EXCLUDE_TABLE_PATTERNS=(
  '^sys_'
  '^drizzle_'
  '^schema_migrations$'
  '^supabase_migrations$'
)

SEED_TABLES=(
  companies
  uoms
  items
  bom_headers
  bom_versions
  customers
  sites
  warehouses
  inventory_moves
  inventory_move_lines
  sales_orders
  sales_order_lines
  work_centers
  work_orders
)

# ---- Helpers ----

die() {
  echo "[ERROR] $*" >&2
  exit 1
}

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

find_first_existing() {
  local p
  for p in "$@"; do
    if [[ -e "$p" ]]; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

psql_exec() {
  # usage: psql_exec "SQL"
  local sql="$1"
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -Atqc "$sql"
}

psql_file() {
  # usage: psql_file /path/to/file.sql
  local file="$1"
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f - < "$file"
}

timestamp_now() {
  date -u +"%Y%m%dT%H%M%SZ"
}

join_by() {
  local IFS="$1"; shift
  echo "$*"
}

# ---- Preflight ----
need_cmd docker
need_cmd date
need_cmd sed
need_cmd grep
need_cmd paste
need_cmd tee
need_cmd find

if ! docker ps --format '{{.Names}}' | grep -qx "$DB_CONTAINER"; then
  die "DB container not running: $DB_CONTAINER"
fi

if [[ ! -x "$RESTORE_SCRIPT" ]]; then
  die "Restore script not found or not executable: $RESTORE_SCRIPT"
fi

OPS_DIR="$(find_first_existing "${CANDIDATE_OPS_DIRS[@]}")" || die "Cannot find ops dir. Tried: $(join_by ', ' "${CANDIDATE_OPS_DIRS[@]}")"
SEED_SQL="$(find_first_existing "${CANDIDATE_SEED_SQLS[@]}")" || die "Cannot find seed SQL. Tried: $(join_by ', ' "${CANDIDATE_SEED_SQLS[@]}")"
SEED_VERIFY_SQL="$(find_first_existing "${CANDIDATE_SEED_VERIFY_SQLS[@]}")" || die "Cannot find seed verify SQL. Tried: $(join_by ', ' "${CANDIDATE_SEED_VERIFY_SQLS[@]}")"

# Phase1 verify SQL path resolution (override via env):
# - PHASE1_VERIFY_SQL: full path to verify SQL file (highest priority)
# - PHASE1_VERIFY_SQL_NAME: filename within ops dir
# - otherwise auto-detect common names and pick first 99*verify*.sql in ops dir
PHASE1_VERIFY_SQL_PATH=""

if [[ -n "${PHASE1_VERIFY_SQL:-}" ]]; then
  [[ -f "${PHASE1_VERIFY_SQL}" ]] || die "PHASE1_VERIFY_SQL is set but file not found: ${PHASE1_VERIFY_SQL}"
  PHASE1_VERIFY_SQL_PATH="${PHASE1_VERIFY_SQL}"
else
  CANDIDATE_PHASE1_VERIFY_SQLS=(
    "$OPS_DIR/$PHASE1_VERIFY_SQL_NAME"
    "$OPS_DIR/99_phase1_verify.sql"
    "$OPS_DIR/99_verify.sql"
  )
  PHASE1_VERIFY_SQL_PATH="$(find_first_existing "${CANDIDATE_PHASE1_VERIFY_SQLS[@]}")" || true

  if [[ -z "$PHASE1_VERIFY_SQL_PATH" ]]; then
    # Common patterns:
    # - date-prefixed verify file, e.g. 20260126_99_phase1_verify.sql
    # - other verify variants living in the ops dir
    auto="$(find "$OPS_DIR" -maxdepth 1 -type f -iname '*_99_phase1_verify.sql' | sort | tail -n 1 || true)"
    if [[ -z "$auto" ]]; then
      auto="$(find "$OPS_DIR" -maxdepth 1 -type f -iname '*99*phase1*verify*.sql' | sort | tail -n 1 || true)"
    fi
    if [[ -z "$auto" ]]; then
      auto="$(find "$OPS_DIR" -maxdepth 1 -type f -iname '*99*verify*.sql' | sort | tail -n 1 || true)"
    fi
    if [[ -n "$auto" ]]; then
      PHASE1_VERIFY_SQL_PATH="$auto"
    fi
  fi
fi

[[ -n "$PHASE1_VERIFY_SQL_PATH" && -f "$PHASE1_VERIFY_SQL_PATH" ]] || die "Cannot find Phase1 verify SQL in ops dir=$OPS_DIR (set PHASE1_VERIFY_SQL or PHASE1_VERIFY_SQL_NAME or PHASE1_OPS_DIR)"

TS="$(timestamp_now)"
RUN_DIR="artifacts/replay/phase1_v1.1/$TS"
mkdir -p "$RUN_DIR"

LOG_RESTORE="$RUN_DIR/01_restore.log"
LOG_SEED="$RUN_DIR/02_seed.log"
LOG_SEED_VERIFY="$RUN_DIR/03_seed_verify.log"
LOG_PHASE1_VERIFY="$RUN_DIR/04_phase1_verify.log"
LOG_SUMMARY="$RUN_DIR/05_summary.txt"

# ---- Pipeline ----
{
  echo "[INFO] Stage2A Phase1 v1.1 replay start: $TS"
  echo "[INFO] db_container=$DB_CONTAINER db_user=$DB_USER db_name=$DB_NAME"
  echo "[INFO] ops_dir=$OPS_DIR"
  echo "[INFO] seed_sql=$SEED_SQL"
  echo "[INFO] seed_verify_sql=$SEED_VERIFY_SQL"
  echo "[INFO] phase1_verify_sql=$PHASE1_VERIFY_SQL_PATH"
  echo "[INFO] run_dir=$RUN_DIR"
} | tee "$LOG_RESTORE" >/dev/null

# 1) Restore latest baseline (expected to be schema+data baseline)
(
  echo "[STEP] restore baseline"
  "$RESTORE_SCRIPT"
) 2>&1 | tee -a "$LOG_RESTORE" >/dev/null

# 2) Seed min_e2e
(
  echo "[STEP] seed min_e2e"
  psql_file "$SEED_SQL"
) 2>&1 | tee "$LOG_SEED" >/dev/null

# 3) Verify min_e2e seed (SQL verify + row-count assertion)
(
  echo "[STEP] verify min_e2e seed (sql)"
  psql_file "$SEED_VERIFY_SQL"

  echo "[STEP] verify min_e2e seed (row counts)"
  ok=0
  total=${#SEED_TABLES[@]}
  for t in "${SEED_TABLES[@]}"; do
    c="$(psql_exec "select count(*) from public.${t};")"
    if [[ "$c" == "1" ]]; then
      ok=$((ok+1))
    else
      echo "[FAIL] seed table ${t} count=${c} (expected 1)"
    fi
  done
  echo "[INFO] seed_rows_ok=${ok}/${total}"
  [[ "$ok" -eq "$total" ]] || exit 2
) 2>&1 | tee "$LOG_SEED_VERIFY" >/dev/null

# 4) Phase1 verify
(
  echo "[STEP] phase1 verify"
  psql_file "$PHASE1_VERIFY_SQL_PATH"
) 2>&1 | tee "$LOG_PHASE1_VERIFY" >/dev/null

# 5) Summary (fixed, parse-friendly)
PUBLIC_TABLES_COUNT="$(psql_exec "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE';")"

# Build exclusion regex: pattern1|pattern2|...
EX_RE="$(printf '%s\n' "${EXCLUDE_TABLE_PATTERNS[@]}" | paste -sd'|' -)"
CORE_TABLES_COUNT="$(psql_exec "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and table_name !~ '${EX_RE}';")"

SEED_OK_LINE="$(grep -E "\[INFO\] seed_rows_ok=" "$LOG_SEED_VERIFY" | tail -n 1 || true)"
# Extract value reliably (avoid bash glob pitfalls with [INFO])
SEED_OK_VALUE="$(echo "$SEED_OK_LINE" | sed -E 's/.*seed_rows_ok=//')"

VERIFY_PASS="PASS"
if grep -Eqi "(^|\s)(ERROR:|FATAL:)" "$LOG_PHASE1_VERIFY"; then
  VERIFY_PASS="FAIL"
fi

cat > "$LOG_SUMMARY" <<SUM
=== PHASE1_REPLAY_SUMMARY ===
timestamp_utc=$TS
db_container=$DB_CONTAINER
db_name=$DB_NAME
public_tables_count=$PUBLIC_TABLES_COUNT
core_tables_count=$CORE_TABLES_COUNT
seed_rows_ok=$SEED_OK_VALUE
verify_phase1=$VERIFY_PASS
run_dir=$RUN_DIR
SUM

cat "$LOG_SUMMARY"

# Treat verify fail as non-zero to keep CI-like semantics
[[ "$VERIFY_PASS" == "PASS" ]] || exit 3

echo "[OK] Stage2A replay finished"
