# Demo Reset After Gate - Runbook

## Purpose
Reset demo master data (UOMs, Items) for Purchase Order UI dropdowns after running gate checks.

## Correct Execution Order

**IMPORTANT**: Follow this sequence exactly to avoid data being overwritten or missing:

```bash
# Step 1: Run gate check (applies migrations, runs tests)
./scripts/gate_app02.sh

# Step 2: Apply demo seed data AFTER gate completes
./scripts/demo_reset_after_gate.sh

# Step 3: Restart API with auto-verification (single command!)
./scripts/dev_restart_api.sh

# Step 4: Open UI and verify
# Navigate to: http://localhost:3002/purchase/orders/create
# Expected: Items and UOM dropdowns should have values
```

## API Server Management

### Recommended: Use dev_restart_api.sh
```bash
# Single command: stops old process, starts new one, verifies routes
./scripts/dev_restart_api.sh

# Override port if needed
API_PORT=3002 ./scripts/dev_restart_api.sh
```

### Manual Alternative
```bash
# Find and kill existing process
pkill -f "node src/index.js" || true

# Start fresh
cd apps/api && npm run start
```

### What dev_restart_api.sh Does
1. Finds and stops existing API process (by port, then by pattern)
2. Starts API server in background
3. Waits for ready (up to 15 seconds)
4. Verifies `/health` returns 200
5. Verifies `POST /uoms` returns non-404 (route exists)
6. Reports pass/fail summary

## Common Issues

| Symptom | Cause | Fix |
|---------|-------|-----|
| POST /uoms returns 404 | API server not restarted | `./scripts/dev_restart_api.sh` |
| PUT /uoms/:id returns 404 | API server not restarted | `./scripts/dev_restart_api.sh` |
| POST /items returns 404 | API server not restarted | `./scripts/dev_restart_api.sh` |
| Items dropdown empty | Ran demo_reset BEFORE gate (gate may overwrite) | Re-run demo_reset_after_gate.sh |
| Items dropdown empty | item_type mismatch (rm vs material) | SVC-APP-014 API fix now maps rm->material |
| UOM dropdown empty | UOMs missing company_id | Already handled by seed 007 |

## Script Details

| Command | Purpose |
|---------|---------|
| `docker inspect "$DB_CONTAINER"` | Verify container exists |
| `docker inspect -f '{{.State.Running}}' "$DB_CONTAINER"` | Verify container is running |
| `docker exec -i "$DB_CONTAINER" psql ...` | Apply seed SQL inside container |

## Seed Files Applied (in order)

1. `004_backflush_data.sql` - Production backflush data
2. `005_purchase_ui_items_type_fix.sql` - Fix item_type for legacy items
3. `007_purchase_ui_uoms_company_fix.sql` - Fix UOM company_id scope
4. `008_demo_master_data_seeds.sql` - Demo UOMs (7) + Items (15 FG/Material)

## Rollback

```bash
# If something goes wrong, restore to pre-seed state by re-running migrations
./scripts/gate_app02.sh
```
