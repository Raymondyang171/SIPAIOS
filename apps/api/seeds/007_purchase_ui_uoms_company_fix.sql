-- Seed: Align demo UOMs with company_id for RLS visibility
-- Updates demo UOMs that have NULL company_id (e.g., PCS, DEMO-UOM-001)

BEGIN;

DO $$
DECLARE
  demo_company_id uuid := '9b8444cb-d8cb-58d7-8322-22d5c95892a1';
  has_company_id boolean := false;
  updated_count int;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'uoms'
      AND column_name = 'company_id'
  ) INTO has_company_id;

  IF NOT has_company_id THEN
    RAISE NOTICE 'uoms.company_id column not found; skipping company alignment';
    RETURN;
  END IF;

  UPDATE public.uoms
  SET company_id = demo_company_id
  WHERE company_id IS NULL
    AND code IN ('PCS', 'DEMO-UOM-001');
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  IF updated_count = 0 THEN
    RAISE NOTICE 'No demo uoms with NULL company_id found for PCS/DEMO-UOM-001';
  END IF;
END $$;

COMMIT;
