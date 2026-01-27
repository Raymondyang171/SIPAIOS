-- Stage 2B (P0): tenant/users/RBAC/RLS minimal closed loop
-- Notes:
-- - Designed to run on plain Postgres (non-Supabase). Provides auth.uid() shim and Supabase-like roles.
-- - All security enforcement is via RLS + membership checks; privileges are granted to roles to allow exercising RLS.

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Supabase-compatible auth.uid() shim (reads request.jwt.claims -> 'sub')
CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE plpgsql STABLE AS $$
DECLARE
  raw text;
  js jsonb;
  sub text;
BEGIN
  raw := NULLIF(current_setting('request.jwt.claims', true), '');
  IF raw IS NULL THEN
    RETURN NULL;
  END IF;

  BEGIN
    js := raw::jsonb;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;

  sub := js->>'sub';
  IF sub IS NULL THEN
    RETURN NULL;
  END IF;

  IF sub ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN sub::uuid;
  END IF;

  RETURN NULL;
END;
$$;

-- Optional app schema (reserved)
CREATE SCHEMA IF NOT EXISTS app;

-- Supabase-like roles on plain Postgres
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN
    CREATE ROLE service_role NOLOGIN;
  END IF;

  -- Ensure the current migration runner can SET ROLE to these (needed for verify)
  BEGIN
    EXECUTE format('GRANT anon TO %I', current_user);
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    EXECUTE format('GRANT authenticated TO %I', current_user);
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
  BEGIN
    EXECUTE format('GRANT service_role TO %I', current_user);
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;

-- Core tables (public.*)
CREATE TABLE IF NOT EXISTS public.sys_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sys_users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  display_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sys_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.sys_tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, name)
);

CREATE TABLE IF NOT EXISTS public.sys_permissions (
  key text PRIMARY KEY,
  description text
);

CREATE TABLE IF NOT EXISTS public.sys_role_permissions (
  role_id uuid NOT NULL REFERENCES public.sys_roles(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.sys_permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS public.sys_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.sys_tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.sys_users(id) ON DELETE CASCADE,
  role_id uuid REFERENCES public.sys_roles(id) ON DELETE SET NULL,
  is_tenant_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_sys_memberships_user ON public.sys_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_sys_roles_tenant ON public.sys_roles(tenant_id);

-- Helper: is member of tenant
CREATE OR REPLACE FUNCTION public.is_tenant_member(p_tenant_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.sys_memberships m
    WHERE m.tenant_id = p_tenant_id AND m.user_id = p_user_id
  )
$$;

-- Helper: is tenant admin (fallbacks to false if column absent)
CREATE OR REPLACE FUNCTION public.is_tenant_admin(p_tenant_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off AS $$
DECLARE
  has_admin_col boolean;
  result boolean := false;
  sql text;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_memberships'
      AND column_name = 'is_tenant_admin'
  ) INTO has_admin_col;

  IF has_admin_col THEN
    sql := '
      SELECT EXISTS(
        SELECT 1 FROM public.sys_memberships m
        WHERE m.tenant_id = $1
          AND m.user_id = $2
          AND m.is_tenant_admin = true
      )';
    EXECUTE sql INTO result USING p_tenant_id, p_user_id;
  ELSE
    result := false;
  END IF;

  RETURN result;
END;
$$;

-- Helper: permission check (RBAC via membership->role->permissions)
CREATE OR REPLACE FUNCTION public.has_permission(p_tenant_id uuid, p_user_id uuid, p_permission_key text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
SET row_security = off AS $$
DECLARE
  has_permission_id boolean;
  has_permission_key boolean;
  has_permissions_id_col boolean;
  result boolean := false;
  sql text;
BEGIN
  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_role_permissions'
      AND column_name = 'permission_id'
  ) INTO has_permission_id;

  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_role_permissions'
      AND column_name = 'permission_key'
  ) INTO has_permission_key;

  IF has_permission_id THEN
    SELECT EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sys_permissions'
        AND column_name = 'id'
    ) INTO has_permissions_id_col;

    IF has_permissions_id_col THEN
      sql := '
        SELECT EXISTS(
          SELECT 1
          FROM public.sys_memberships m
          JOIN public.sys_role_permissions rp ON rp.role_id = m.role_id
          JOIN public.sys_permissions p ON p.id = rp.permission_id
          WHERE m.tenant_id = $1
            AND m.user_id = $2
            AND p.key = $3
        )';
      EXECUTE sql INTO result USING p_tenant_id, p_user_id, p_permission_key;
    ELSE
      result := false;
    END IF;
  ELSIF has_permission_key THEN
    sql := '
      SELECT EXISTS(
        SELECT 1
        FROM public.sys_memberships m
        JOIN public.sys_role_permissions rp ON rp.role_id = m.role_id
        WHERE m.tenant_id = $1
          AND m.user_id = $2
          AND rp.permission_key = $3
      )';
    EXECUTE sql INTO result USING p_tenant_id, p_user_id, p_permission_key;
  ELSE
    result := false;
  END IF;

  RETURN result;
END;
$$;

-- Enable RLS
ALTER TABLE public.sys_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_memberships ENABLE ROW LEVEL SECURITY;

-- ========= Privileges (plain Postgres needs GRANTs in addition to RLS) =========
-- We grant minimal table privileges to roles, then rely on RLS to enforce tenant isolation.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- service_role: full access to sys_* tables (used for bootstrap/ops/verify)
GRANT ALL PRIVILEGES ON TABLE
  public.sys_tenants,
  public.sys_users,
  public.sys_roles,
  public.sys_permissions,
  public.sys_role_permissions,
  public.sys_memberships
TO service_role;

-- authenticated: can interact, but RLS constrains rows
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.sys_tenants,
  public.sys_users,
  public.sys_roles,
  public.sys_permissions,
  public.sys_role_permissions,
  public.sys_memberships
TO authenticated;

-- anon: read-only on permissions (optional)
GRANT SELECT ON TABLE public.sys_permissions TO anon;

-- ========= Policies =========

-- sys_tenants: members can read their tenant; service_role can write
DROP POLICY IF EXISTS tenants_select_own ON public.sys_tenants;
CREATE POLICY tenants_select_own ON public.sys_tenants
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(id, auth.uid()));

DROP POLICY IF EXISTS tenants_write_service ON public.sys_tenants;
CREATE POLICY tenants_write_service ON public.sys_tenants
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- sys_users: users can see/update self; service_role full
DROP POLICY IF EXISTS users_select_self ON public.sys_users;
CREATE POLICY users_select_self ON public.sys_users
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS users_update_self ON public.sys_users;
CREATE POLICY users_update_self ON public.sys_users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS users_write_service ON public.sys_users;
CREATE POLICY users_write_service ON public.sys_users
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- sys_roles: members can read roles of their tenant; writes require permission; service_role allowed
DROP POLICY IF EXISTS roles_select_by_membership ON public.sys_roles;
CREATE POLICY roles_select_by_membership ON public.sys_roles
  FOR SELECT TO authenticated
  USING (public.is_tenant_member(tenant_id, auth.uid()));

DROP POLICY IF EXISTS roles_write_by_permission ON public.sys_roles;
CREATE POLICY roles_write_by_permission ON public.sys_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_permission(tenant_id, auth.uid(), 'rbac.roles.write'));

DROP POLICY IF EXISTS roles_update_by_permission ON public.sys_roles;
CREATE POLICY roles_update_by_permission ON public.sys_roles
  FOR UPDATE TO authenticated
  USING (public.has_permission(tenant_id, auth.uid(), 'rbac.roles.write'))
  WITH CHECK (public.has_permission(tenant_id, auth.uid(), 'rbac.roles.write'));

DROP POLICY IF EXISTS roles_delete_by_permission ON public.sys_roles;
CREATE POLICY roles_delete_by_permission ON public.sys_roles
  FOR DELETE TO authenticated
  USING (public.has_permission(tenant_id, auth.uid(), 'rbac.roles.write'));

-- service_role full
DROP POLICY IF EXISTS roles_write_service ON public.sys_roles;
CREATE POLICY roles_write_service ON public.sys_roles
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- sys_permissions: readable to all logged-in; writable to service_role
DROP POLICY IF EXISTS perms_select_all ON public.sys_permissions;
CREATE POLICY perms_select_all ON public.sys_permissions
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS perms_write_service ON public.sys_permissions;
CREATE POLICY perms_write_service ON public.sys_permissions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- sys_role_permissions: members can read for their tenant; writes require permission; service_role allowed
DROP POLICY IF EXISTS role_perms_select_by_membership ON public.sys_role_permissions;
CREATE POLICY role_perms_select_by_membership ON public.sys_role_permissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sys_roles r
      WHERE r.id = role_id
        AND public.is_tenant_member(r.tenant_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS role_perms_write_by_permission ON public.sys_role_permissions;
CREATE POLICY role_perms_write_by_permission ON public.sys_role_permissions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sys_roles r
      WHERE r.id = role_id
        AND public.has_permission(r.tenant_id, auth.uid(), 'rbac.role_permissions.write')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sys_roles r
      WHERE r.id = role_id
        AND public.has_permission(r.tenant_id, auth.uid(), 'rbac.role_permissions.write')
    )
  );

DROP POLICY IF EXISTS role_perms_write_service ON public.sys_role_permissions;
CREATE POLICY role_perms_write_service ON public.sys_role_permissions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- sys_memberships: user can see self; tenant admin can see tenant; writes: service_role + tenant admin
DROP POLICY IF EXISTS memberships_select_self ON public.sys_memberships;
CREATE POLICY memberships_select_self ON public.sys_memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS memberships_select_tenant_admin ON public.sys_memberships;
CREATE POLICY memberships_select_tenant_admin ON public.sys_memberships
  FOR SELECT TO authenticated
  USING (public.is_tenant_admin(tenant_id, auth.uid()));

DROP POLICY IF EXISTS memberships_write_service ON public.sys_memberships;
CREATE POLICY memberships_write_service ON public.sys_memberships
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS memberships_write_tenant_admin ON public.sys_memberships;
CREATE POLICY memberships_write_tenant_admin ON public.sys_memberships
  FOR INSERT TO authenticated
  WITH CHECK (public.is_tenant_admin(tenant_id, auth.uid()));

COMMIT;
