-- Stage 2B Org/HR: sys_depts table + sys_users extensions
-- Designed to run after 10_stage2b_rbac_rls.sql
-- Idempotent: uses IF NOT EXISTS / IF EXISTS patterns

BEGIN;

-- ============================================================
-- sys_depts: Department table
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sys_depts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.sys_tenants(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_sys_depts_tenant ON public.sys_depts(tenant_id);

-- ============================================================
-- sys_users: Add dept_id and is_active columns
-- ============================================================
DO $$
BEGIN
  -- Add dept_id column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_users'
      AND column_name = 'dept_id'
  ) THEN
    ALTER TABLE public.sys_users ADD COLUMN dept_id uuid REFERENCES public.sys_depts(id) ON DELETE SET NULL;
  END IF;

  -- Add is_active column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_users'
      AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.sys_users ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;

  -- Add updated_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_users'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.sys_users ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- ============================================================
-- RLS Policies for sys_depts
-- ============================================================
ALTER TABLE public.sys_depts ENABLE ROW LEVEL SECURITY;

-- service_role: full access
DROP POLICY IF EXISTS depts_service_full ON public.sys_depts;
CREATE POLICY depts_service_full ON public.sys_depts
  TO service_role
  USING (true)
  WITH CHECK (true);

-- authenticated: can read depts in their tenant
DROP POLICY IF EXISTS depts_select_tenant ON public.sys_depts;
CREATE POLICY depts_select_tenant ON public.sys_depts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sys_memberships m
      WHERE m.tenant_id = sys_depts.tenant_id
        AND m.user_id = auth.uid()
    )
  );

-- authenticated tenant_admin: can write depts in their tenant
DROP POLICY IF EXISTS depts_write_admin ON public.sys_depts;
CREATE POLICY depts_write_admin ON public.sys_depts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sys_memberships m
      WHERE m.tenant_id = sys_depts.tenant_id
        AND m.user_id = auth.uid()
        AND m.is_tenant_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sys_memberships m
      WHERE m.tenant_id = sys_depts.tenant_id
        AND m.user_id = auth.uid()
        AND m.is_tenant_admin = true
    )
  );

-- ============================================================
-- Grants
-- ============================================================
GRANT ALL ON TABLE public.sys_depts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.sys_depts TO authenticated;

COMMIT;
