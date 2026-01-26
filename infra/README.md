# SIPAIOS Infra Skeleton v0.1

Prod-like local stack via Docker Compose:
- Postgres 16
- Redis 7
- MinIO
- Nginx (HTTP reverse proxy)
- Placeholder app (replace later)

## Quick start (local)
From repo root:
1) Copy env template:
   - .env.example -> .env.local
2) Start stack:
   - docker compose --env-file .env.local -f infra/compose/compose.yaml up -d

## Apply DB schema
Your Phase 1 SQL is under:
- phase1_schema_v1.1_sql/supabase/ops/
We will apply them step-by-step after the stack is healthy.
