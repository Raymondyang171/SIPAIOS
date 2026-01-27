-- AUTO-GENERATED. Do not edit by hand.
\echo '==[1/3] sanity: public tables count =='
select count(*) as public_tables from pg_tables where schemaname='public';

\echo '==[2/3] seed rows exist? (by PK if has id) =='
select 'companies' as table,
  (case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='companies' and column_name='id')
        then (select count(*) from public."companies" where id='9b8444cb-d8cb-58d7-8322-22d5c95892a1'::uuid)
        else (select count(*) from public."companies") end) as rows;
select 'uoms' as table,
  (case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='uoms' and column_name='id')
        then (select count(*) from public."uoms" where id='d42de897-d9d5-580e-b1fb-2e700cd5a90d'::uuid)
        else (select count(*) from public."uoms") end) as rows;
select 'items' as table,
  (case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='items' and column_name='id')
        then (select count(*) from public."items" where id='addc1fe5-52ba-5fb9-9ee7-ef48ecd8fd39'::uuid)
        else (select count(*) from public."items") end) as rows;
select 'bom_headers' as table,
  (case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='bom_headers' and column_name='id')
        then (select count(*) from public."bom_headers" where id='e8270bf7-6c57-51fc-a505-c10781e92b83'::uuid)
        else (select count(*) from public."bom_headers") end) as rows;
select 'bom_versions' as table,
  (case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='bom_versions' and column_name='id')
        then (select count(*) from public."bom_versions" where id='11ad1c25-46aa-556c-bedb-a7c241270871'::uuid)
        else (select count(*) from public."bom_versions") end) as rows;
select 'customers' as table,
  (case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='customers' and column_name='id')
        then (select count(*) from public."customers" where id='ec0c336e-8e04-5841-859f-081a11fd7031'::uuid)
        else (select count(*) from public."customers") end) as rows;
select 'sites' as table,
  (case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='sites' and column_name='id')
        then (select count(*) from public."sites" where id='45826f7c-2aa5-5ca9-a721-4c5a013cb1cb'::uuid)
        else (select count(*) from public."sites") end) as rows;
select 'inventory_moves' as table,
  (case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='inventory_moves' and column_name='id')
        then (select count(*) from public."inventory_moves" where id='520dc334-b4d4-5418-b7fd-a93646d57ac2'::uuid)
        else (select count(*) from public."inventory_moves") end) as rows;
select 'warehouses' as table,
  (case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='warehouses' and column_name='id')
        then (select count(*) from public."warehouses" where id='7baabd52-b63f-50a4-888a-6d3f39d41986'::uuid)
        else (select count(*) from public."warehouses") end) as rows;
select 'inventory_move_lines' as table,
  (case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='inventory_move_lines' and column_name='id')
        then (select count(*) from public."inventory_move_lines" where id='7f2c67b8-aca3-5e5b-8df2-97f889f869e0'::uuid)
        else (select count(*) from public."inventory_move_lines") end) as rows;
select 'sales_orders' as table,
  (case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='sales_orders' and column_name='id')
        then (select count(*) from public."sales_orders" where id='0559179b-4ec4-519a-a95a-1dfc98a70c79'::uuid)
        else (select count(*) from public."sales_orders") end) as rows;
select 'sales_order_lines' as table,
  (case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='sales_order_lines' and column_name='id')
        then (select count(*) from public."sales_order_lines" where id='42532e22-2d2f-5340-b477-7cd4d46d653e'::uuid)
        else (select count(*) from public."sales_order_lines") end) as rows;
select 'work_centers' as table,
  (case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='work_centers' and column_name='id')
        then (select count(*) from public."work_centers" where id='d8c14d7c-b9f8-5324-b64a-90c2ad63da60'::uuid)
        else (select count(*) from public."work_centers") end) as rows;
select 'work_orders' as table,
  (case when exists (select 1 from information_schema.columns where table_schema='public' and table_name='work_orders' and column_name='id')
        then (select count(*) from public."work_orders" where id='6a81925a-711e-50b1-b202-a241b8048a43'::uuid)
        else (select count(*) from public."work_orders") end) as rows;

\echo '==[3/3] done =='
