-- Seed: Fix item_type contract for Purchase UI demo data
-- Ensures FG-001 uses item_type = 'fg' and aligns raw material item_type when possible

BEGIN;

DO $$
DECLARE
  demo_company_id uuid := '9b8444cb-d8cb-58d7-8322-22d5c95892a1';
  item_type_udt text;
  item_type_data_type text;
  has_rm boolean := false;
  updated_fg int;
  updated_rm int;
BEGIN
  SELECT data_type, udt_name
  INTO item_type_data_type, item_type_udt
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'items'
    AND column_name = 'item_type';

  IF item_type_data_type IS NULL THEN
    RAISE NOTICE 'items.item_type column not found; skipping item_type alignment';
    RETURN;
  END IF;

  IF item_type_data_type = 'USER-DEFINED' THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON e.enumtypid = t.oid
      WHERE t.typname = item_type_udt
        AND e.enumlabel = 'rm'
    ) INTO has_rm;
  ELSE
    has_rm := true;
  END IF;

  UPDATE public.items
  SET item_type = 'fg'
  WHERE company_id = demo_company_id
    AND item_no = 'FG-001';
  GET DIAGNOSTICS updated_fg = ROW_COUNT;
  IF updated_fg = 0 THEN
    RAISE NOTICE 'No FG-001 found for demo company; nothing to update';
  END IF;

  IF has_rm THEN
    UPDATE public.items
    SET item_type = 'rm'
    WHERE company_id = demo_company_id
      AND item_no = 'ITEM-001';
    GET DIAGNOSTICS updated_rm = ROW_COUNT;
    IF updated_rm = 0 THEN
      RAISE NOTICE 'No ITEM-001 found for demo company; rm alignment skipped';
    END IF;
  ELSE
    RAISE NOTICE 'item_type enum does not contain rm; skip rm alignment';
  END IF;
END $$;

COMMIT;
