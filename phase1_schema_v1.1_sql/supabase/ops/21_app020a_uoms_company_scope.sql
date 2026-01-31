-- SVC-APP-020A: UOM company scope hotfix
BEGIN;

ALTER TABLE public.uoms
  ADD COLUMN IF NOT EXISTS company_id uuid;

UPDATE public.uoms
SET company_id = '9b8444cb-d8cb-58d7-8322-22d5c95892a1'
WHERE company_id IS NULL;

ALTER TABLE public.uoms
  ALTER COLUMN company_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uoms_company_id_fkey'
  ) THEN
    ALTER TABLE public.uoms
      ADD CONSTRAINT uoms_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;
  END IF;
END $$;

ALTER TABLE public.uoms
  DROP CONSTRAINT IF EXISTS uoms_code_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uoms_company_id_code_key'
  ) THEN
    ALTER TABLE public.uoms
      ADD CONSTRAINT uoms_company_id_code_key UNIQUE (company_id, code);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_uoms_company_id ON public.uoms(company_id);

COMMIT;
