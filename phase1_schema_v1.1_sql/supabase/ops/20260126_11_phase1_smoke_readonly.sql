-- Phase 1 Smoke (READ-ONLY)
-- Purpose: Catch schema landmines early (PK/FK basics) without writing any data.

\echo '==[1/4] tables missing PRIMARY KEY =='
WITH tbl AS (
  SELECT c.oid AS relid, n.nspname AS schema_name, c.relname AS table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r' AND n.nspname = 'public'
)
SELECT t.schema_name, t.table_name
FROM tbl t
LEFT JOIN pg_constraint con
  ON con.conrelid = t.relid AND con.contype = 'p'
WHERE con.oid IS NULL
ORDER BY 1,2;

\echo ''
\echo '==[2/4] business tables missing company_id (WARN) =='
-- This is a warning list (not necessarily an error) to help you spot tenant-scoping gaps early.
WITH business_tables AS (
  SELECT unnest(ARRAY[
    'companies','sites','warehouses','customers',
    'items','uoms','item_uom_conversions','lot_uom_conversions','item_cycle_time_versions',
    'bom_headers','bom_versions','bom_lines',
    'sales_orders','sales_order_lines',
    'work_centers','work_orders','work_order_events','production_lots','production_schedules',
    'purchase_orders','purchase_order_lines','goods_receipts','goods_receipt_lines','iqc_records',
    'inventory_moves','inventory_move_lines','inventory_lots','inventory_balances',
    'shipments','shipment_lines',
    'backflush_runs','backflush_allocations',
    'audit_events'
  ]) AS table_name
)
SELECT bt.table_name
FROM business_tables bt
LEFT JOIN information_schema.columns c
  ON c.table_schema='public' AND c.table_name=bt.table_name AND c.column_name='company_id'
WHERE c.column_name IS NULL
ORDER BY 1;

\echo ''
\echo '==[3/4] table foreign key counts (FYI) =='
WITH tbl AS (
  SELECT c.oid AS relid, c.relname AS table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind='r' AND n.nspname='public'
)
SELECT t.table_name,
       COUNT(*) FILTER (WHERE con.contype='f') AS fk_count,
       COUNT(*) FILTER (WHERE con.contype='u') AS unique_count,
       COUNT(*) FILTER (WHERE con.contype='c') AS check_count
FROM tbl t
LEFT JOIN pg_constraint con ON con.conrelid = t.relid
GROUP BY t.table_name
ORDER BY t.table_name;

\echo ''
\echo '==[4/4] enum sanity (counts by enum) =='
SELECT t.typname AS enum_name, COUNT(e.enumlabel) AS value_count
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname='public'
GROUP BY t.typname
ORDER BY t.typname;
