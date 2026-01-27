#!/usr/bin/env bash
set -euo pipefail

# Stage 2B wrapper: runs Stage2A replay, then applies Stage2B ops/seed/verify.
# Design goals:
# - No host-side psql dependency
# - No host TCP/port dependency (runs psql inside the DB container)
# - No secrets committed; no interactive password prompts
#
# Overrides (optional):
#   DB_CONTAINER=sipaios-postgres
#   DB_NAME=sipaios
#   DB_USER=sipaios

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

DB_CONTAINER="${DB_CONTAINER:-sipaios-postgres}"
DB_NAME="${DB_NAME:-sipaios}"
DB_USER="${DB_USER:-sipaios}"

STAGE2A="${ROOT_DIR}/scripts/db/00_replay_phase1_v1_1.sh"
OPS_DIR="${ROOT_DIR}/phase1_schema_v1.1_sql/supabase/ops"

SQL_10="${OPS_DIR}/10_stage2b_rbac_rls.sql"
SQL_20="${OPS_DIR}/20_stage2b_seed_rbac.sql"
SQL_99="${OPS_DIR}/99_stage2b_verify_rbac_rls.sql"

run_psql_in_container () {
  local sql_file="$1"
  echo "[INFO] apply: $(basename "$sql_file")"
  # Pipe host file into container psql (no need to mount paths)
  cat "$sql_file" | docker exec -i "$DB_CONTAINER" psql -v ON_ERROR_STOP=1 -U "$DB_USER" -d "$DB_NAME"
}

# 1) Run Stage2A replay (restore -> ops/seed -> verify) as the foundation
bash "$STAGE2A"
echo "[OK] Stage2A replay finished"

# 2) Stage2B apply (schema -> seed -> verify)
run_psql_in_container "$SQL_10"
run_psql_in_container "$SQL_20"
run_psql_in_container "$SQL_99"

echo "[OK] Stage2B replay finished"
