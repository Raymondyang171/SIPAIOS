-- SIP AIOS Demo Seed Fix: Align demo items.item_type to fg/rm for Purchase UI
-- Purpose: Ensure /items?type=fg,rm returns demo items (Create PO dropdown not empty)
-- Scope: Data-only update (no schema/migration). Safe to re-run.

BEGIN;

DO $$
DECLARE
  col_udt text;
  is_enum boolean;
  has_fg boolean;
  has_rm boolean;
BEGIN
  SELECT udt_name INTO col_udt
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'items'
    AND column_name = 'item_type';

  IF col_udt IS NULL THEN
    RAISE EXCEPTION 'Demo seed fix aborted: public.items.item_type column not found.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = col_udt
      AND t.typtype = 'e'
  ) INTO is_enum;

  IF is_enum THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = col_udt
        AND e.enumlabel = 'fg'
    ) INTO has_fg;

    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = col_udt
        AND e.enumlabel = 'rm'
    ) INTO has_rm;

    IF NOT has_fg THEN
      RAISE EXCEPTION 'Demo seed fix aborted: enum type % missing value fg.', col_udt;
    END IF;
    IF NOT has_rm THEN
      RAISE NOTICE 'Demo seed fix: enum type % missing value rm. Skipping RM updates; FG update will proceed.', col_udt;
    END IF;
  END IF;
END $$;

-- FG demo item
UPDATE public.items
SET item_type = 'fg'
WHERE item_no = 'FG-001';

-- RM demo items
DO $$
DECLARE
  col_udt text;
  is_enum boolean;
  has_rm boolean;
BEGIN
  SELECT udt_name INTO col_udt
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'items'
    AND column_name = 'item_type';

  IF col_udt IS NULL THEN
    RAISE EXCEPTION 'Demo seed fix aborted: public.items.item_type column not found.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = col_udt
      AND t.typtype = 'e'
  ) INTO is_enum;

  IF is_enum THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = col_udt
        AND e.enumlabel = 'rm'
    ) INTO has_rm;
  ELSE
    has_rm := true;
  END IF;

  IF has_rm THEN
    UPDATE public.items
    SET item_type = 'rm'
    WHERE item_no IN ('ITEM-001', 'DEMO-ITE-001');
  END IF;
END $$;

-- Verification
SELECT item_no, name, item_type
FROM public.items
WHERE item_no IN ('FG-001', 'ITEM-001', 'DEMO-ITE-001')
ORDER BY item_no;

COMMIT;
