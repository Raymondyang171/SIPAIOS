-- Seed: Demo master UOMs (company-scoped)
-- Idempotent via UNIQUE(company_id, code)
-- Demo company_id: 9b8444cb-d8cb-58d7-8322-22d5c95892a1
-- Fixed UUIDs for test compatibility (Postman expects test_uom_id = 00000000-0000-0000-0000-000000000001)

BEGIN;

-- Use fixed UUIDs for test data reproducibility
INSERT INTO public.uoms (id, company_id, code, name)
VALUES
  ('00000000-0000-0000-0000-000000000002', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'BOX', 'Box'),
  ('00000000-0000-0000-0000-000000000003', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'EA', 'Each'),
  ('00000000-0000-0000-0000-000000000004', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'KG', 'Kilogram'),
  ('00000000-0000-0000-0000-000000000001', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'PCS', 'Piece')
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name;

COMMIT;
