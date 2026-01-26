-- Phase 1 | Verify | Sys tables (schema gate + idempotency)
-- Safe to run multiple times; read-only checks only.

\echo '==[1/4] tables exist? =='
SELECT table_schema, table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('sys_schema_version', 'sys_idempotency_keys')
ORDER BY table_name;

\echo '==[2/4] sys_* columns =='
SELECT table_name, ordinal_position, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('sys_schema_version', 'sys_idempotency_keys')
ORDER BY table_name, ordinal_position;

\echo '==[3/4] sys_schema_version snapshot (top 20) =='
SELECT *
FROM public.sys_schema_version
ORDER BY 1 DESC
LIMIT 20;

\echo '==[4/4] idempotency indexes =='
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'sys_idempotency_keys'
ORDER BY indexname;
