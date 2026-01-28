-- Stage2C Tenant Key Scan (READ-ONLY)
-- Purpose: inventory tenant key candidates and FK paths for RLS scoping decisions.

\echo '==[1/3] public table columns (tenant key candidates bracketed) =='
WITH cols AS (
  SELECT table_name, column_name, ordinal_position
  FROM information_schema.columns
  WHERE table_schema = 'public'
)
SELECT c.table_name,
       string_agg(
         CASE
           WHEN c.column_name IN ('company_id','tenant_id','org_id','site_id')
             THEN '[' || c.column_name || ']'
           ELSE c.column_name
         END,
         ', ' ORDER BY c.ordinal_position
       ) AS columns
FROM cols c
GROUP BY c.table_name
ORDER BY c.table_name;

\echo ''
\echo '==[2/3] foreign key relationships (table -> referenced table) =='
WITH fk AS (
  SELECT con.oid, con.conname, con.conrelid, con.confrelid, con.conkey, con.confkey
  FROM pg_constraint con
  JOIN pg_namespace n ON n.oid = con.connamespace
  WHERE con.contype = 'f' AND n.nspname = 'public'
)
SELECT src.relname AS table_name,
       fk.conname AS fk_name,
       tgt.relname AS referenced_table,
       string_agg(src_col.attname, ', ' ORDER BY k.ord) AS fk_columns,
       string_agg(tgt_col.attname, ', ' ORDER BY k.ord) AS referenced_columns
FROM fk
JOIN pg_class src ON src.oid = fk.conrelid
JOIN pg_class tgt ON tgt.oid = fk.confrelid
JOIN unnest(fk.conkey) WITH ORDINALITY AS k(attnum, ord) ON TRUE
JOIN pg_attribute src_col ON src_col.attrelid = src.oid AND src_col.attnum = k.attnum
JOIN unnest(fk.confkey) WITH ORDINALITY AS rk(attnum, ord) ON rk.ord = k.ord
JOIN pg_attribute tgt_col ON tgt_col.attrelid = tgt.oid AND tgt_col.attnum = rk.attnum
GROUP BY src.relname, fk.conname, tgt.relname
ORDER BY src.relname, fk.conname;

\echo ''
\echo '==[3/3] tables missing tenant key candidates =='
WITH tbl AS (
  SELECT c.relname AS table_name
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relkind = 'r' AND n.nspname = 'public'
)
SELECT t.table_name
FROM tbl t
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public'
 AND c.table_name = t.table_name
 AND c.column_name IN ('company_id','tenant_id','org_id','site_id')
GROUP BY t.table_name
HAVING COUNT(c.column_name) = 0
ORDER BY t.table_name;
