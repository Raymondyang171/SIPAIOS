-- Seed: Demo master UOMs (company-scoped)
-- Idempotent via UNIQUE(company_id, code)
-- Demo company_id: 9b8444cb-d8cb-58d7-8322-22d5c95892a1

BEGIN;

INSERT INTO public.uoms (company_id, code, name)
VALUES
  ('9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'BOX', 'Box'),
  ('9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'EA', 'Each'),
  ('9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'KG', 'Kilogram'),
  ('9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'PCS', 'Pieces')
ON CONFLICT (company_id, code) DO UPDATE SET
  name = EXCLUDED.name;

COMMIT;
