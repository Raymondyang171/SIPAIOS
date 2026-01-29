-- Seed: Test data for APP-03 Production MO (Work Order with BOM Version Lock)
-- Creates: BOM Header, BOM Version, Finished Good Item for DEMO company
-- Requires: 002_purchase_test_data.sql to be run first (for uom, site, warehouse)

BEGIN;

-- Fixed UUIDs for MO test data
-- UUID scheme: 00000000-0000-0000-0000-0000000005XX for MO-related
--   501 = finished good item, 502 = bom_header, 503 = bom_version (active), 504 = bom_version (for other company)

-- DEMO company ID: 9b8444cb-d8cb-58d7-8322-22d5c95892a1
-- TEST-COM-002 ID: aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002

-- Finished Good Item: FG-001 for DEMO company
INSERT INTO public.items (id, company_id, item_no, name, item_type, base_uom_id)
VALUES ('00000000-0000-0000-0000-000000000501', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'FG-001', 'Finished Good 001', 'material', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET item_no = EXCLUDED.item_no, name = EXCLUDED.name;

-- BOM Header for FG-001
INSERT INTO public.bom_headers (id, company_id, fg_item_id, code)
VALUES ('00000000-0000-0000-0000-000000000502', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', '00000000-0000-0000-0000-000000000501', 'BOM-FG-001')
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code;

-- BOM Version v1 (active) for FG-001
INSERT INTO public.bom_versions (id, bom_header_id, version_no, status, effective_from, note)
VALUES ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000502', 1, 'active', now(), 'Initial version for MO test')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note;

-- BOM Line: FG-001 uses ITEM-001 as component (1 piece per unit)
INSERT INTO public.bom_lines (id, bom_version_id, line_no, component_item_id, qty_per, uom_id, scrap_factor)
VALUES ('00000000-0000-0000-0000-000000000510', '00000000-0000-0000-0000-000000000503', 1, '00000000-0000-0000-0000-000000000401', 1.000000, '00000000-0000-0000-0000-000000000001', 0.000000)
ON CONFLICT (id) DO UPDATE SET qty_per = EXCLUDED.qty_per;

-- For cross-tenant test: FG item and BOM for TEST-COM-002
INSERT INTO public.items (id, company_id, item_no, name, item_type, base_uom_id)
VALUES ('00000000-0000-0000-0000-000000000505', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002', 'FG-002', 'Finished Good 002', 'material', '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET item_no = EXCLUDED.item_no, name = EXCLUDED.name;

INSERT INTO public.bom_headers (id, company_id, fg_item_id, code)
VALUES ('00000000-0000-0000-0000-000000000506', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002', '00000000-0000-0000-0000-000000000505', 'BOM-FG-002')
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code;

INSERT INTO public.bom_versions (id, bom_header_id, version_no, status, effective_from, note)
VALUES ('00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000506', 1, 'active', now(), 'Other company BOM version')
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note;

COMMIT;
