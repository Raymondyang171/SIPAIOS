-- 50_stage2c_tenant_closure_wave1.sql
-- Goal:
-- 1) Enforce companies.id == sys_tenants.id (tenant identity)
-- 2) Wave1 strict: inventory_move_lines, shipment_lines must carry company_id
--    and must match their headers via composite FK.

BEGIN;

-- ------------------------------------------------------------
-- (A) Tenant Identity: companies.id must exist in sys_tenants.id
--     + enforce slug = lower(companies.code)
-- ------------------------------------------------------------

-- Preflight: detect slug conflicts (same slug owned by different tenant_id)
DO $$
DECLARE
  v_conflict_cnt int;
  v_conflicts text;
BEGIN
  SELECT count(DISTINCT t.id), string_agg(DISTINCT lower(c.code) || ' -> tenants:' || t.id || ',' || c.id, '; ')
  INTO v_conflict_cnt, v_conflicts
  FROM public.companies c
  JOIN public.sys_tenants t ON lower(c.code) = t.slug AND t.id <> c.id;

  IF v_conflict_cnt > 0 THEN
    RAISE EXCEPTION 'Slug conflict detected: slug=lower(companies.code) already owned by different sys_tenants.id. Conflicts: %', v_conflicts;
  END IF;
END $$;

-- Backfill sys_tenants rows for existing companies (idempotent)
-- slug = lower(companies.code) ALWAYS
INSERT INTO public.sys_tenants (id, slug, name)
SELECT c.id, lower(c.code), c.name
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.sys_tenants t WHERE t.id = c.id
)
ON CONFLICT (id) DO UPDATE
  SET slug = EXCLUDED.slug,
      name = EXCLUDED.name;

-- Update existing sys_tenants to align slug (idempotent)
UPDATE public.sys_tenants t
SET slug = lower(c.code),
    name = c.name
FROM public.companies c
WHERE t.id = c.id
  AND (t.slug IS DISTINCT FROM lower(c.code) OR t.name IS DISTINCT FROM c.name);

-- Add FK companies(id) -> sys_tenants(id) if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_id_fkey_sys_tenants'
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_id_fkey_sys_tenants
      FOREIGN KEY (id) REFERENCES public.sys_tenants(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- Optional (recommended): drop default so creating a company requires an explicit id (same as sys_tenants.id)
-- This makes the contract obvious and prevents "silent UUID drift".
DO $$
BEGIN
  -- Drop default if it exists
  IF EXISTS (
    SELECT 1
    FROM pg_attrdef d
    JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum
    JOIN pg_class c ON c.oid = d.adrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'companies' AND a.attname = 'id'
  ) THEN
    ALTER TABLE public.companies ALTER COLUMN id DROP DEFAULT;
  END IF;
END $$;

-- ------------------------------------------------------------
-- (B) Wave1 strict: inventory_move_lines.company_id
-- ------------------------------------------------------------

-- 1) Add column (nullable first)
ALTER TABLE public.inventory_move_lines
  ADD COLUMN IF NOT EXISTS company_id uuid;

-- 2) Backfill from header
UPDATE public.inventory_move_lines l
SET company_id = m.company_id
FROM public.inventory_moves m
WHERE l.move_id = m.id
  AND l.company_id IS NULL;

-- 3) Hard fail if any row still NULL (forces data cleanup, prevents half-migrations)
DO $$
DECLARE v_cnt bigint;
BEGIN
  SELECT count(*) INTO v_cnt
  FROM public.inventory_move_lines
  WHERE company_id IS NULL;

  IF v_cnt > 0 THEN
    RAISE EXCEPTION 'Backfill failed: inventory_move_lines.company_id still NULL rows=%', v_cnt;
  END IF;
END $$;

-- 4) Make NOT NULL
ALTER TABLE public.inventory_move_lines
  ALTER COLUMN company_id SET NOT NULL;

-- 5) Add unique on header (id, company_id) to support composite FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_moves_id_company_id_uk'
  ) THEN
    ALTER TABLE public.inventory_moves
      ADD CONSTRAINT inventory_moves_id_company_id_uk UNIQUE (id, company_id);
  END IF;
END $$;

-- 6) Composite FK ensures line.company_id matches header.company_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'inventory_move_lines_move_company_fkey'
  ) THEN
    ALTER TABLE public.inventory_move_lines
      ADD CONSTRAINT inventory_move_lines_move_company_fkey
      FOREIGN KEY (move_id, company_id)
      REFERENCES public.inventory_moves (id, company_id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 7) Index for RLS/filters
CREATE INDEX IF NOT EXISTS inventory_move_lines_company_id_idx
  ON public.inventory_move_lines (company_id);

-- ------------------------------------------------------------
-- (C) Wave1 strict: shipment_lines.company_id
-- ------------------------------------------------------------

ALTER TABLE public.shipment_lines
  ADD COLUMN IF NOT EXISTS company_id uuid;

UPDATE public.shipment_lines l
SET company_id = s.company_id
FROM public.shipments s
WHERE l.shipment_id = s.id
  AND l.company_id IS NULL;

DO $$
DECLARE v_cnt bigint;
BEGIN
  SELECT count(*) INTO v_cnt
  FROM public.shipment_lines
  WHERE company_id IS NULL;

  IF v_cnt > 0 THEN
    RAISE EXCEPTION 'Backfill failed: shipment_lines.company_id still NULL rows=%', v_cnt;
  END IF;
END $$;

ALTER TABLE public.shipment_lines
  ALTER COLUMN company_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shipments_id_company_id_uk'
  ) THEN
    ALTER TABLE public.shipments
      ADD CONSTRAINT shipments_id_company_id_uk UNIQUE (id, company_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shipment_lines_ship_company_fkey'
  ) THEN
    ALTER TABLE public.shipment_lines
      ADD CONSTRAINT shipment_lines_ship_company_fkey
      FOREIGN KEY (shipment_id, company_id)
      REFERENCES public.shipments (id, company_id)
      ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS shipment_lines_company_id_idx
  ON public.shipment_lines (company_id);

COMMIT;
