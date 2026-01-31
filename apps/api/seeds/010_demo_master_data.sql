-- SVC-APP-021B: Demo Master Data Seeds (suppliers/sites/warehouses/uoms/items)
-- Purpose: Ensure all master data tables have DEMO company data for UI pages
-- Scope: Data-only seed, no schema changes. Safe to re-run (idempotent).
-- Company lookup: by code = 'DEMO-COM-001'

BEGIN;

-- ============================================================
-- Lookup DEMO company ID (do not hardcode across files)
-- ============================================================
DO $$
DECLARE
  v_company_id uuid;
BEGIN
  SELECT id INTO v_company_id FROM public.companies WHERE code = 'DEMO-COM-001';
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'DEMO company not found (code=DEMO-COM-001). Run base seed first.';
  END IF;
  RAISE NOTICE 'DEMO company_id: %', v_company_id;
END $$;

-- ============================================================
-- SUPPLIERS (3 records)
-- Fixed UUIDs for test compatibility (Postman expects test_supplier_id = 00000000-0000-0000-0000-000000000101)
-- ============================================================

INSERT INTO public.suppliers (id, company_id, code, name)
SELECT
  v.id::uuid,
  c.id,
  v.code,
  v.name
FROM (VALUES
  ('00000000-0000-0000-0000-000000000101', 'SUP-001', 'Alpha Materials Co.'),
  ('00000000-0000-0000-0000-000000000111', 'SUP-002', 'Beta Components Ltd.'),
  ('00000000-0000-0000-0000-000000000112', 'SUP-003', 'Gamma Packaging Inc.')
) AS v(id, code, name)
CROSS JOIN public.companies c
WHERE c.code = 'DEMO-COM-001'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name;

-- ============================================================
-- SITES (2 records)
-- ============================================================

INSERT INTO public.sites (company_id, code, name)
SELECT
  c.id,
  v.code,
  v.name
FROM (VALUES
  ('SITE-HQ', 'Headquarters Factory'),
  ('SITE-WH', 'Warehouse Center')
) AS v(code, name)
CROSS JOIN public.companies c
WHERE c.code = 'DEMO-COM-001'
ON CONFLICT (company_id, code) DO UPDATE SET
  name = EXCLUDED.name;

-- ============================================================
-- WAREHOUSES (4 records - 2 per site)
-- ============================================================

-- Warehouses for SITE-HQ
INSERT INTO public.warehouses (site_id, code, name, category, is_active)
SELECT
  s.id,
  v.code,
  v.name,
  v.category::warehouse_category,
  true
FROM (VALUES
  ('WH-RM', 'Raw Material Storage', 'normal'),
  ('WH-FG', 'Finished Goods Storage', 'normal')
) AS v(code, name, category)
CROSS JOIN public.sites s
JOIN public.companies c ON s.company_id = c.id
WHERE c.code = 'DEMO-COM-001' AND s.code = 'SITE-HQ'
ON CONFLICT (site_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active;

-- Warehouses for SITE-WH
INSERT INTO public.warehouses (site_id, code, name, category, is_active)
SELECT
  s.id,
  v.code,
  v.name,
  v.category::warehouse_category,
  true
FROM (VALUES
  ('WH-DIST', 'Distribution Center', 'normal'),
  ('WH-QC', 'Quality Control Hold', 'quarantine')
) AS v(code, name, category)
CROSS JOIN public.sites s
JOIN public.companies c ON s.company_id = c.id
WHERE c.code = 'DEMO-COM-001' AND s.code = 'SITE-WH'
ON CONFLICT (site_id, code) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active;

-- ============================================================
-- UOMS (6 records)
-- ============================================================

INSERT INTO public.uoms (company_id, code, name)
SELECT
  c.id,
  v.code,
  v.name
FROM (VALUES
  ('PCS', 'Pieces'),
  ('KG', 'Kilogram'),
  ('SET', 'Set'),
  ('BOX', 'Box'),
  ('EA', 'Each'),
  ('MTR', 'Meter')
) AS v(code, name)
CROSS JOIN public.companies c
WHERE c.code = 'DEMO-COM-001'
ON CONFLICT (company_id, code) DO UPDATE SET
  name = EXCLUDED.name;

-- ============================================================
-- ITEMS (10 records: 5 FG + 5 RM/Material)
-- Fixed UUIDs for test compatibility (Postman expects test_fg_item_id = 00000000-0000-0000-0000-000000000501)
-- ============================================================

-- FG Items (5 records) - using fixed UUIDs
INSERT INTO public.items (id, company_id, item_no, name, item_type, base_uom_id)
SELECT
  v.id::uuid,
  c.id,
  v.item_no,
  v.name,
  'fg'::item_type,
  u.id
FROM (VALUES
  ('00000000-0000-0000-0000-000000000501', 'FG-001', 'Finished Product Alpha', 'PCS'),
  ('00000000-0000-0000-0000-000000000512', 'FG-002', 'Finished Product Beta', 'PCS'),
  ('00000000-0000-0000-0000-000000000513', 'FG-003', 'Assembly Unit Gamma', 'SET'),
  ('00000000-0000-0000-0000-000000000514', 'FG-004', 'Module Delta', 'PCS'),
  ('00000000-0000-0000-0000-000000000515', 'FG-005', 'Package Set Epsilon', 'BOX')
) AS v(id, item_no, name, uom_code)
CROSS JOIN public.companies c
JOIN public.uoms u ON u.company_id = c.id AND u.code = v.uom_code
WHERE c.code = 'DEMO-COM-001'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  item_type = EXCLUDED.item_type,
  base_uom_id = EXCLUDED.base_uom_id;

-- RM/Material Items (5 records) - using fixed UUIDs
INSERT INTO public.items (id, company_id, item_no, name, item_type, base_uom_id)
SELECT
  v.id::uuid,
  c.id,
  v.item_no,
  v.name,
  'material'::item_type,
  u.id
FROM (VALUES
  ('00000000-0000-0000-0000-000000000521', 'RM-001', 'Raw Material Steel', 'KG'),
  ('00000000-0000-0000-0000-000000000522', 'RM-002', 'Raw Material Copper', 'KG'),
  ('00000000-0000-0000-0000-000000000523', 'RM-003', 'Component Board', 'PCS'),
  ('00000000-0000-0000-0000-000000000524', 'RM-004', 'Wire Cable', 'MTR'),
  ('00000000-0000-0000-0000-000000000525', 'RM-005', 'Packaging Box', 'BOX')
) AS v(id, item_no, name, uom_code)
CROSS JOIN public.companies c
JOIN public.uoms u ON u.company_id = c.id AND u.code = v.uom_code
WHERE c.code = 'DEMO-COM-001'
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  item_type = EXCLUDED.item_type,
  base_uom_id = EXCLUDED.base_uom_id;

-- ============================================================
-- Verification: Print row counts for DEMO company
-- ============================================================

SELECT 'suppliers' AS table_name, COUNT(*) AS count
FROM public.suppliers s
JOIN public.companies c ON s.company_id = c.id
WHERE c.code = 'DEMO-COM-001'
UNION ALL
SELECT 'sites', COUNT(*)
FROM public.sites s
JOIN public.companies c ON s.company_id = c.id
WHERE c.code = 'DEMO-COM-001'
UNION ALL
SELECT 'warehouses', COUNT(*)
FROM public.warehouses w
JOIN public.sites s ON w.site_id = s.id
JOIN public.companies c ON s.company_id = c.id
WHERE c.code = 'DEMO-COM-001'
UNION ALL
SELECT 'uoms', COUNT(*)
FROM public.uoms u
JOIN public.companies c ON u.company_id = c.id
WHERE c.code = 'DEMO-COM-001'
UNION ALL
SELECT 'items', COUNT(*)
FROM public.items i
JOIN public.companies c ON i.company_id = c.id
WHERE c.code = 'DEMO-COM-001'
ORDER BY table_name;

COMMIT;
