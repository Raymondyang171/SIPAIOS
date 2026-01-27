-- AUTO-GENERATED. Do not edit by hand.
begin;
-- Minimal E2E seed (closure over required FK parents).
-- Idempotent via ON CONFLICT (PK).

-- tables_count=14

-- table: companies
insert into public."companies" ("id", "code", "name")
values ('9b8444cb-d8cb-58d7-8322-22d5c95892a1'::uuid, 'DEMO-COM-001', 'DEMO companies')
on conflict ("id") do update set "code" = EXCLUDED."code", "name" = EXCLUDED."name";

-- table: uoms
insert into public."uoms" ("id", "code", "name")
values ('d42de897-d9d5-580e-b1fb-2e700cd5a90d'::uuid, 'DEMO-UOM-001', 'DEMO uoms')
on conflict ("id") do update set "code" = EXCLUDED."code", "name" = EXCLUDED."name";

-- table: items
insert into public."items" ("id", "company_id", "item_no", "name", "item_type", "base_uom_id")
values ('addc1fe5-52ba-5fb9-9ee7-ef48ecd8fd39'::uuid, '9b8444cb-d8cb-58d7-8322-22d5c95892a1'::uuid, 'DEMO-ITE-001', 'DEMO items', 'material'::"item_type", 'd42de897-d9d5-580e-b1fb-2e700cd5a90d'::uuid)
on conflict ("id") do update set "company_id" = EXCLUDED."company_id", "item_no" = EXCLUDED."item_no", "name" = EXCLUDED."name", "item_type" = EXCLUDED."item_type", "base_uom_id" = EXCLUDED."base_uom_id";

-- table: bom_headers
insert into public."bom_headers" ("id", "company_id", "fg_item_id")
values ('e8270bf7-6c57-51fc-a505-c10781e92b83'::uuid, '9b8444cb-d8cb-58d7-8322-22d5c95892a1'::uuid, 'addc1fe5-52ba-5fb9-9ee7-ef48ecd8fd39'::uuid)
on conflict ("id") do update set "company_id" = EXCLUDED."company_id", "fg_item_id" = EXCLUDED."fg_item_id";

-- table: bom_versions
insert into public."bom_versions" ("id", "bom_header_id", "version_no")
values ('11ad1c25-46aa-556c-bedb-a7c241270871'::uuid, 'e8270bf7-6c57-51fc-a505-c10781e92b83'::uuid, 1)
on conflict ("id") do update set "bom_header_id" = EXCLUDED."bom_header_id", "version_no" = EXCLUDED."version_no";

-- table: customers
insert into public."customers" ("id", "company_id", "code", "name")
values ('ec0c336e-8e04-5841-859f-081a11fd7031'::uuid, '9b8444cb-d8cb-58d7-8322-22d5c95892a1'::uuid, 'DEMO-CUS-001', 'DEMO customers')
on conflict ("id") do update set "company_id" = EXCLUDED."company_id", "code" = EXCLUDED."code", "name" = EXCLUDED."name";

-- table: sites
insert into public."sites" ("id", "company_id", "code", "name")
values ('45826f7c-2aa5-5ca9-a721-4c5a013cb1cb'::uuid, '9b8444cb-d8cb-58d7-8322-22d5c95892a1'::uuid, 'DEMO-SIT-001', 'DEMO sites')
on conflict ("id") do update set "company_id" = EXCLUDED."company_id", "code" = EXCLUDED."code", "name" = EXCLUDED."name";

-- table: inventory_moves
insert into public."inventory_moves" ("id", "company_id", "site_id", "move_type")
values ('520dc334-b4d4-5418-b7fd-a93646d57ac2'::uuid, '9b8444cb-d8cb-58d7-8322-22d5c95892a1'::uuid, '45826f7c-2aa5-5ca9-a721-4c5a013cb1cb'::uuid, 'grn_receipt'::"inventory_move_type")
on conflict ("id") do update set "company_id" = EXCLUDED."company_id", "site_id" = EXCLUDED."site_id", "move_type" = EXCLUDED."move_type";

-- table: warehouses
insert into public."warehouses" ("id", "site_id", "code", "name")
values ('7baabd52-b63f-50a4-888a-6d3f39d41986'::uuid, '45826f7c-2aa5-5ca9-a721-4c5a013cb1cb'::uuid, 'DEMO-WAR-001', 'DEMO warehouses')
on conflict ("id") do update set "site_id" = EXCLUDED."site_id", "code" = EXCLUDED."code", "name" = EXCLUDED."name";

-- table: inventory_move_lines
insert into public."inventory_move_lines" ("id", "move_id", "item_id", "qty", "uom_id")
values ('7f2c67b8-aca3-5e5b-8df2-97f889f869e0'::uuid, '520dc334-b4d4-5418-b7fd-a93646d57ac2'::uuid, 'addc1fe5-52ba-5fb9-9ee7-ef48ecd8fd39'::uuid, 1.000, 'd42de897-d9d5-580e-b1fb-2e700cd5a90d'::uuid)
on conflict ("id") do update set "move_id" = EXCLUDED."move_id", "item_id" = EXCLUDED."item_id", "qty" = EXCLUDED."qty", "uom_id" = EXCLUDED."uom_id";

-- table: sales_orders
insert into public."sales_orders" ("id", "company_id", "site_id", "customer_id", "so_no")
values ('0559179b-4ec4-519a-a95a-1dfc98a70c79'::uuid, '9b8444cb-d8cb-58d7-8322-22d5c95892a1'::uuid, '45826f7c-2aa5-5ca9-a721-4c5a013cb1cb'::uuid, 'ec0c336e-8e04-5841-859f-081a11fd7031'::uuid, 'DEMO-SAL-001')
on conflict ("id") do update set "company_id" = EXCLUDED."company_id", "site_id" = EXCLUDED."site_id", "customer_id" = EXCLUDED."customer_id", "so_no" = EXCLUDED."so_no";

-- table: sales_order_lines
insert into public."sales_order_lines" ("id", "sales_order_id", "line_no", "item_id", "qty", "uom_id")
values ('42532e22-2d2f-5340-b477-7cd4d46d653e'::uuid, '0559179b-4ec4-519a-a95a-1dfc98a70c79'::uuid, 1, 'addc1fe5-52ba-5fb9-9ee7-ef48ecd8fd39'::uuid, 1.000, 'd42de897-d9d5-580e-b1fb-2e700cd5a90d'::uuid)
on conflict ("id") do update set "sales_order_id" = EXCLUDED."sales_order_id", "line_no" = EXCLUDED."line_no", "item_id" = EXCLUDED."item_id", "qty" = EXCLUDED."qty", "uom_id" = EXCLUDED."uom_id";

-- table: work_centers
insert into public."work_centers" ("id", "company_id", "site_id", "code", "name")
values ('d8c14d7c-b9f8-5324-b64a-90c2ad63da60'::uuid, '9b8444cb-d8cb-58d7-8322-22d5c95892a1'::uuid, '45826f7c-2aa5-5ca9-a721-4c5a013cb1cb'::uuid, 'DEMO-WOR-001', 'DEMO work_centers')
on conflict ("id") do update set "company_id" = EXCLUDED."company_id", "site_id" = EXCLUDED."site_id", "code" = EXCLUDED."code", "name" = EXCLUDED."name";

-- table: work_orders
insert into public."work_orders" ("id", "company_id", "site_id", "wo_no", "item_id", "planned_qty", "uom_id", "bom_version_id", "primary_warehouse_id")
values ('6a81925a-711e-50b1-b202-a241b8048a43'::uuid, '9b8444cb-d8cb-58d7-8322-22d5c95892a1'::uuid, '45826f7c-2aa5-5ca9-a721-4c5a013cb1cb'::uuid, 'DEMO-WOR-001', 'addc1fe5-52ba-5fb9-9ee7-ef48ecd8fd39'::uuid, 1.000, 'd42de897-d9d5-580e-b1fb-2e700cd5a90d'::uuid, '11ad1c25-46aa-556c-bedb-a7c241270871'::uuid, '7baabd52-b63f-50a4-888a-6d3f39d41986'::uuid)
on conflict ("id") do update set "company_id" = EXCLUDED."company_id", "site_id" = EXCLUDED."site_id", "wo_no" = EXCLUDED."wo_no", "item_id" = EXCLUDED."item_id", "planned_qty" = EXCLUDED."planned_qty", "uom_id" = EXCLUDED."uom_id", "bom_version_id" = EXCLUDED."bom_version_id", "primary_warehouse_id" = EXCLUDED."primary_warehouse_id";

commit;
