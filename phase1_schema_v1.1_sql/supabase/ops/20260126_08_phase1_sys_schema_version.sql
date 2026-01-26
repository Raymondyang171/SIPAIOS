BEGIN;

-- Phase 1 platform baseline: schema version gate
CREATE TABLE IF NOT EXISTS public.sys_schema_version (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_name text NOT NULL,
  version text NOT NULL,
  checksum text,
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by text,
  notes text
);

CREATE UNIQUE INDEX IF NOT EXISTS sys_schema_version_schema_name_uq
  ON public.sys_schema_version (schema_name);

-- Seed/Upsert baseline version record
INSERT INTO public.sys_schema_version (schema_name, version, checksum, applied_by, notes)
VALUES (
  'phase1',
  '1.1',
  NULL,
  current_user,
  'Baseline: Phase 1 schema v1.1 (local/on-prem build)'
)
ON CONFLICT (schema_name)
DO UPDATE SET
  version = EXCLUDED.version,
  checksum = EXCLUDED.checksum,
  applied_at = now(),
  applied_by = EXCLUDED.applied_by,
  notes = EXCLUDED.notes;

COMMIT;
