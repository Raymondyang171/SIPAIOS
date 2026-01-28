# SIP AIOS - Development Makefile
# One-click commands for common DB operations

.PHONY: reset restore replay verify help

# Default target
help:
	@echo "SIP AIOS Development Commands:"
	@echo "  make reset   - Full reset: restore baseline + seed + verify (< 30s target)"
	@echo "  make restore - Restore Phase1 baseline only (destructive)"
	@echo "  make replay  - Alias for reset"
	@echo "  make verify  - Run Phase1 verify only"
	@echo ""
	@echo "Configuration (override via env):"
	@echo "  DB_CONTAINER  (default: sipaios-postgres)"
	@echo "  DB_USER       (default: sipaios)"
	@echo "  DB_NAME       (default: sipaios)"

# Full reset: restore -> seed -> verify
reset:
	@echo "=== make reset: Full Phase1 replay (target < 30s) ==="
	@time ./scripts/db/00_replay_phase1_v1_1.sh

# Restore Phase1 baseline only
restore:
	@echo "=== make restore: Restore Phase1 baseline ==="
	./scripts/db/08_restore_latest_phase1_baseline.sh

# Alias for reset
replay: reset

# Verify only (requires DB already has Phase1 schema)
verify:
	@echo "=== make verify: Run Phase1 verify ==="
	@docker exec -i $${DB_CONTAINER:-sipaios-postgres} psql \
		-U $${DB_USER:-sipaios} -d $${DB_NAME:-sipaios} \
		-v ON_ERROR_STOP=1 \
		-f - < phase1_schema_v1.1_sql/supabase/ops/*_99_phase1_verify.sql
