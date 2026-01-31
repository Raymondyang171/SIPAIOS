-- SVC-OPS-015: Demo Master Data Seeds (UOM + Items)
-- Purpose: Populate UOMs and Items for /purchase/orders/create dropdown
-- Scope: Data-only seed, no schema changes. Safe to re-run (idempotent).
-- Demo company_id: 9b8444cb-d8cb-58d7-8322-22d5c95892a1

BEGIN;

-- ============================================================
-- UOMs (5 records)
-- UUID scheme: 00000000-0000-0000-0000-0000000008XX
--   801-805 = UOMs
-- ============================================================

-- Note: UOM PCS (00000000-0000-0000-0000-000000000001) already exists from 002 seed
-- Update existing PCS to have company_id, then add new UOMs

UPDATE public.uoms
SET company_id = '9b8444cb-d8cb-58d7-8322-22d5c95892a1'
WHERE id = '00000000-0000-0000-0000-000000000001' AND company_id IS NULL;

INSERT INTO public.uoms (id, code, name, company_id)
VALUES
  ('00000000-0000-0000-0000-000000000801', 'KG', 'Kilogram', '9b8444cb-d8cb-58d7-8322-22d5c95892a1'),
  ('00000000-0000-0000-0000-000000000802', 'SET', 'Set', '9b8444cb-d8cb-58d7-8322-22d5c95892a1'),
  ('00000000-0000-0000-0000-000000000803', 'BOX', 'Box', '9b8444cb-d8cb-58d7-8322-22d5c95892a1'),
  ('00000000-0000-0000-0000-000000000804', 'EA', 'Each', '9b8444cb-d8cb-58d7-8322-22d5c95892a1'),
  ('00000000-0000-0000-0000-000000000805', 'MTR', 'Meter', '9b8444cb-d8cb-58d7-8322-22d5c95892a1')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  company_id = EXCLUDED.company_id;

-- Also ensure DEMO-UOM-001 from min_e2e seed has company_id
UPDATE public.uoms
SET company_id = '9b8444cb-d8cb-58d7-8322-22d5c95892a1'
WHERE id = 'd42de897-d9d5-580e-b1fb-2e700cd5a90d' AND company_id IS NULL;

-- ============================================================
-- Items (15 records: 7 FG + 8 Material)
-- UUID scheme: 00000000-0000-0000-0000-0000000008XX
--   810-816 = FG items (item_type='fg')
--   820-827 = Material items (item_type='material')
-- Note: API /items?type=fg,rm only matches 'fg' (enum has no 'rm')
--       Material items added for future API fix compatibility
-- ============================================================

-- FG Items (7 records) - these will appear in dropdown
INSERT INTO public.items (id, company_id, item_no, name, item_type, base_uom_id)
VALUES
  ('00000000-0000-0000-0000-000000000810', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'FG-DEMO-001', 'Demo Finished Product A', 'fg', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000811', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'FG-DEMO-002', 'Demo Finished Product B', 'fg', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000812', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'FG-DEMO-003', 'Demo Assembly Unit', 'fg', '00000000-0000-0000-0000-000000000802'),
  ('00000000-0000-0000-0000-000000000813', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'FG-DEMO-004', 'Demo Module X', 'fg', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000814', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'FG-DEMO-005', 'Demo Module Y', 'fg', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000815', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'FG-DEMO-006', 'Demo Package Set', 'fg', '00000000-0000-0000-0000-000000000803'),
  ('00000000-0000-0000-0000-000000000816', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'FG-DEMO-007', 'Demo Complete System', 'fg', '00000000-0000-0000-0000-000000000804')
ON CONFLICT (id) DO UPDATE SET
  item_no = EXCLUDED.item_no,
  name = EXCLUDED.name,
  item_type = EXCLUDED.item_type,
  base_uom_id = EXCLUDED.base_uom_id;

-- Material Items (8 records) - for future API fix (rm->material mapping)
INSERT INTO public.items (id, company_id, item_no, name, item_type, base_uom_id)
VALUES
  ('00000000-0000-0000-0000-000000000820', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'MAT-DEMO-001', 'Demo Raw Material A', 'material', '00000000-0000-0000-0000-000000000801'),
  ('00000000-0000-0000-0000-000000000821', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'MAT-DEMO-002', 'Demo Raw Material B', 'material', '00000000-0000-0000-0000-000000000801'),
  ('00000000-0000-0000-0000-000000000822', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'MAT-DEMO-003', 'Demo Component X', 'material', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000823', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'MAT-DEMO-004', 'Demo Component Y', 'material', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000824', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'MAT-DEMO-005', 'Demo Wire Cable', 'material', '00000000-0000-0000-0000-000000000805'),
  ('00000000-0000-0000-0000-000000000825', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'MAT-DEMO-006', 'Demo Packaging Material', 'material', '00000000-0000-0000-0000-000000000803'),
  ('00000000-0000-0000-0000-000000000826', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'MAT-DEMO-007', 'Demo Fastener Set', 'material', '00000000-0000-0000-0000-000000000802'),
  ('00000000-0000-0000-0000-000000000827', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'MAT-DEMO-008', 'Demo Adhesive', 'material', '00000000-0000-0000-0000-000000000804')
ON CONFLICT (id) DO UPDATE SET
  item_no = EXCLUDED.item_no,
  name = EXCLUDED.name,
  item_type = EXCLUDED.item_type,
  base_uom_id = EXCLUDED.base_uom_id;

-- Also update existing FG-001 to ensure item_type='fg'
UPDATE public.items
SET item_type = 'fg'
WHERE item_no = 'FG-001' AND company_id = '9b8444cb-d8cb-58d7-8322-22d5c95892a1';

-- ============================================================
-- Verification queries
-- ============================================================

SELECT 'UOMs count' as check_type, COUNT(*) as count
FROM public.uoms
WHERE company_id = '9b8444cb-d8cb-58d7-8322-22d5c95892a1';

SELECT 'Items (FG) count' as check_type, COUNT(*) as count
FROM public.items
WHERE company_id = '9b8444cb-d8cb-58d7-8322-22d5c95892a1'
  AND item_type = 'fg';

SELECT 'Items (Material) count' as check_type, COUNT(*) as count
FROM public.items
WHERE company_id = '9b8444cb-d8cb-58d7-8322-22d5c95892a1'
  AND item_type = 'material';

COMMIT;
