-- Seed: Test data for APP-02 Purchase Loop
-- Creates: UOM, Site, Warehouse, Supplier, Item for DEMO company

BEGIN;

-- Fixed UUIDs for test data (reproducible for Postman tests)
-- DEMO company: 9b8444cb-d8cb-58d7-8322-22d5c95892a1
-- UUID scheme: 00000000-0000-0000-0000-0000000000XX
--   001 = uom, 101-102 = supplier, 201-202 = site, 301 = warehouse, 401 = item

-- UOM: PCS (piece) - uoms table has company_id, unique key is (company_id, code)
INSERT INTO public.uoms (id, company_id, code, name)
VALUES ('00000000-0000-0000-0000-000000000001', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'PCS', 'Piece')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Site: MAIN site for DEMO company
INSERT INTO public.sites (id, company_id, code, name)
VALUES ('00000000-0000-0000-0000-000000000201', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'MAIN', 'Main Site')
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name;

-- Warehouse: WH-01 for MAIN site
INSERT INTO public.warehouses (id, site_id, code, name, category)
VALUES ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000201', 'WH-01', 'Warehouse 01', 'normal')
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name;

-- Supplier: SUP-001 for DEMO company
INSERT INTO public.suppliers (id, company_id, code, name)
VALUES ('00000000-0000-0000-0000-000000000101', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'SUP-001', 'Test Supplier 001')
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name;

-- Item: ITEM-001 for DEMO company
INSERT INTO public.items (id, company_id, item_no, name, item_type, base_uom_id)
VALUES ('00000000-0000-0000-0000-000000000401', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'ITEM-001', 'Test Item 001', 'material', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET item_no = EXCLUDED.item_no, name = EXCLUDED.name;

-- Site for TEST-COM-002 (second company for cross-company tests)
INSERT INTO public.sites (id, company_id, code, name)
VALUES ('00000000-0000-0000-0000-000000000202', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002', 'MAIN', 'Main Site')
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name;

-- Supplier for TEST-COM-002
INSERT INTO public.suppliers (id, company_id, code, name)
VALUES ('00000000-0000-0000-0000-000000000102', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002', 'SUP-002', 'Test Supplier 002')
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name;

COMMIT;
