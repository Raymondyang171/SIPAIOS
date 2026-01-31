-- Stage 2B verify: tenant isolation (cross-tenant read/write must be rejected)
-- Works on plain Postgres using auth.uid() shim + request.jwt.claims.
BEGIN;

-- Use service_role for setup & cleanup (RLS policies allow it)
SET LOCAL ROLE service_role;

-- ============================================================
-- Pre-check: sys_depts table must exist (from 11_stage2b_org_hr.sql)
-- ============================================================
DO $$
DECLARE
  has_depts_table boolean;
  has_depts_code boolean;
  has_depts_name boolean;
  has_user_dept_id boolean;
  has_user_is_active boolean;
BEGIN
  -- Check sys_depts table exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'sys_depts'
  ) INTO has_depts_table;

  IF NOT has_depts_table THEN
    RAISE EXCEPTION '[VERIFY FAIL] sys_depts table does not exist. Run 11_stage2b_org_hr.sql first.';
  END IF;

  -- Check sys_depts has required columns
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sys_depts' AND column_name = 'code'
  ) INTO has_depts_code;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sys_depts' AND column_name = 'name'
  ) INTO has_depts_name;

  IF NOT has_depts_code OR NOT has_depts_name THEN
    RAISE EXCEPTION '[VERIFY FAIL] sys_depts missing required columns (code, name).';
  END IF;

  -- Check sys_users has dept_id and is_active columns
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sys_users' AND column_name = 'dept_id'
  ) INTO has_user_dept_id;

  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sys_users' AND column_name = 'is_active'
  ) INTO has_user_is_active;

  IF NOT has_user_dept_id THEN
    RAISE EXCEPTION '[VERIFY FAIL] sys_users missing dept_id column. Run 11_stage2b_org_hr.sql first.';
  END IF;

  IF NOT has_user_is_active THEN
    RAISE EXCEPTION '[VERIFY FAIL] sys_users missing is_active column. Run 11_stage2b_org_hr.sql first.';
  END IF;

  RAISE NOTICE '[VERIFY OK] sys_depts table and sys_users extensions exist.';
END $$;

DO $$
DECLARE
  t_a uuid;
  t_b uuid;
  u1 uuid := gen_random_uuid();
  u2 uuid := gen_random_uuid();
  r_admin_a uuid;
  r_user_b uuid;
  has_permission_id boolean;
  has_permission_key boolean;
  p_roles_write_id uuid;
  p_role_perms_write_id uuid;
  has_admin_col boolean;
  has_tenant_slug boolean;
  has_tenant_name boolean;
  has_tenant_code boolean;
  has_role_name boolean;
  has_role_key boolean;
  has_role_code boolean;
  has_user_email boolean;
  has_user_display_name boolean;
BEGIN
  -- Cleanup sys_depts from previous runs
  DELETE FROM public.sys_depts WHERE code LIKE 'vfy_%';
  -- Cleanup from previous runs (idempotent)
  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_roles'
      AND column_name = 'name'
  ) INTO has_role_name;

  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_roles'
      AND column_name = 'key'
  ) INTO has_role_key;

  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_roles'
      AND column_name = 'code'
  ) INTO has_role_code;

  IF has_role_name THEN
    EXECUTE 'DELETE FROM public.sys_role_permissions rp WHERE rp.role_id IN (SELECT id FROM public.sys_roles WHERE name LIKE ''vfy_%'')';
  ELSIF has_role_key THEN
    EXECUTE 'DELETE FROM public.sys_role_permissions rp WHERE rp.role_id IN (SELECT id FROM public.sys_roles WHERE key LIKE ''vfy_%'')';
  ELSIF has_role_code THEN
    EXECUTE 'DELETE FROM public.sys_role_permissions rp WHERE rp.role_id IN (SELECT id FROM public.sys_roles WHERE code LIKE ''vfy_%'')';
  ELSE
    RAISE EXCEPTION 'sys_roles missing name/key/code';
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_users'
      AND column_name = 'email'
  ) INTO has_user_email;

  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_users'
      AND column_name = 'display_name'
  ) INTO has_user_display_name;

  IF has_user_email THEN
    EXECUTE 'DELETE FROM public.sys_memberships m WHERE m.user_id IN (SELECT id FROM public.sys_users WHERE email LIKE ''vfy_%'')';
  ELSIF has_user_display_name THEN
    EXECUTE 'DELETE FROM public.sys_memberships m WHERE m.user_id IN (SELECT id FROM public.sys_users WHERE display_name LIKE ''vfy_%'')';
  ELSE
    RAISE EXCEPTION 'sys_users missing email/display_name';
  END IF;

  IF has_role_name THEN
    EXECUTE 'DELETE FROM public.sys_roles r WHERE r.name LIKE ''vfy_%''';
  ELSIF has_role_key THEN
    EXECUTE 'DELETE FROM public.sys_roles r WHERE r.key LIKE ''vfy_%''';
  ELSIF has_role_code THEN
    EXECUTE 'DELETE FROM public.sys_roles r WHERE r.code LIKE ''vfy_%''';
  END IF;
  IF has_user_email THEN
    EXECUTE 'DELETE FROM public.sys_users u WHERE u.email LIKE ''vfy_%''';
  ELSIF has_user_display_name THEN
    EXECUTE 'DELETE FROM public.sys_users u WHERE u.display_name LIKE ''vfy_%''';
  END IF;
  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_tenants'
      AND column_name = 'slug'
  ) INTO has_tenant_slug;

  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_tenants'
      AND column_name = 'name'
  ) INTO has_tenant_name;

  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_tenants'
      AND column_name = 'code'
  ) INTO has_tenant_code;

  IF has_tenant_slug THEN
    EXECUTE 'DELETE FROM public.sys_tenants t WHERE t.slug LIKE ''vfy_%''';
  ELSIF has_tenant_code THEN
    EXECUTE 'DELETE FROM public.sys_tenants t WHERE t.code LIKE ''vfy_%''';
  ELSIF has_tenant_name THEN
    EXECUTE 'DELETE FROM public.sys_tenants t WHERE t.name LIKE ''vfy_%''';
  ELSE
    RAISE EXCEPTION 'sys_tenants missing slug/name';
  END IF;

  -- Seed two tenants
  IF has_tenant_slug AND has_tenant_code AND has_tenant_name THEN
    EXECUTE 'INSERT INTO public.sys_tenants(slug, code, name) VALUES ($1, $2, $3) RETURNING id'
      INTO t_a USING 'vfy_tenant_a', 'vfy_tenant_a', 'vfy_tenant_a';
    EXECUTE 'INSERT INTO public.sys_tenants(slug, code, name) VALUES ($1, $2, $3) RETURNING id'
      INTO t_b USING 'vfy_tenant_b', 'vfy_tenant_b', 'vfy_tenant_b';
  ELSIF has_tenant_slug AND has_tenant_code THEN
    EXECUTE 'INSERT INTO public.sys_tenants(slug, code) VALUES ($1, $2) RETURNING id'
      INTO t_a USING 'vfy_tenant_a', 'vfy_tenant_a';
    EXECUTE 'INSERT INTO public.sys_tenants(slug, code) VALUES ($1, $2) RETURNING id'
      INTO t_b USING 'vfy_tenant_b', 'vfy_tenant_b';
  ELSIF has_tenant_slug AND has_tenant_name THEN
    EXECUTE 'INSERT INTO public.sys_tenants(slug, name) VALUES ($1, $2) RETURNING id'
      INTO t_a USING 'vfy_tenant_a', 'vfy_tenant_a';
    EXECUTE 'INSERT INTO public.sys_tenants(slug, name) VALUES ($1, $2) RETURNING id'
      INTO t_b USING 'vfy_tenant_b', 'vfy_tenant_b';
  ELSIF has_tenant_code AND has_tenant_name THEN
    EXECUTE 'INSERT INTO public.sys_tenants(code, name) VALUES ($1, $2) RETURNING id'
      INTO t_a USING 'vfy_tenant_a', 'vfy_tenant_a';
    EXECUTE 'INSERT INTO public.sys_tenants(code, name) VALUES ($1, $2) RETURNING id'
      INTO t_b USING 'vfy_tenant_b', 'vfy_tenant_b';
  ELSIF has_tenant_slug THEN
    EXECUTE 'INSERT INTO public.sys_tenants(slug) VALUES ($1) RETURNING id'
      INTO t_a USING 'vfy_tenant_a';
    EXECUTE 'INSERT INTO public.sys_tenants(slug) VALUES ($1) RETURNING id'
      INTO t_b USING 'vfy_tenant_b';
  ELSIF has_tenant_code THEN
    EXECUTE 'INSERT INTO public.sys_tenants(code) VALUES ($1) RETURNING id'
      INTO t_a USING 'vfy_tenant_a';
    EXECUTE 'INSERT INTO public.sys_tenants(code) VALUES ($1) RETURNING id'
      INTO t_b USING 'vfy_tenant_b';
  ELSIF has_tenant_name THEN
    EXECUTE 'INSERT INTO public.sys_tenants(name) VALUES ($1) RETURNING id'
      INTO t_a USING 'vfy_tenant_a';
    EXECUTE 'INSERT INTO public.sys_tenants(name) VALUES ($1) RETURNING id'
      INTO t_b USING 'vfy_tenant_b';
  ELSE
    RAISE EXCEPTION 'sys_tenants missing slug/name/code';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _vfy_tenants(
    label text PRIMARY KEY,
    tenant_id uuid
  );
  TRUNCATE TABLE _vfy_tenants;
  INSERT INTO _vfy_tenants(label, tenant_id) VALUES
    ('a', t_a),
    ('b', t_b);
  GRANT SELECT ON TABLE _vfy_tenants TO authenticated;

  -- Seed verify users
  IF has_user_email AND has_user_display_name THEN
    EXECUTE 'INSERT INTO public.sys_users(id, email, display_name) VALUES ($1, $2, $3)'
      USING u1, 'vfy_u1@local', 'vfy_u1';
    EXECUTE 'INSERT INTO public.sys_users(id, email, display_name) VALUES ($1, $2, $3)'
      USING u2, 'vfy_u2@local', 'vfy_u2';
  ELSIF has_user_email THEN
    EXECUTE 'INSERT INTO public.sys_users(id, email) VALUES ($1, $2)'
      USING u1, 'vfy_u1@local';
    EXECUTE 'INSERT INTO public.sys_users(id, email) VALUES ($1, $2)'
      USING u2, 'vfy_u2@local';
  ELSIF has_user_display_name THEN
    EXECUTE 'INSERT INTO public.sys_users(id, display_name) VALUES ($1, $2)'
      USING u1, 'vfy_u1';
    EXECUTE 'INSERT INTO public.sys_users(id, display_name) VALUES ($1, $2)'
      USING u2, 'vfy_u2';
  ELSE
    RAISE EXCEPTION 'sys_users missing email/display_name';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _vfy_users(
    label text PRIMARY KEY,
    user_id uuid
  );
  TRUNCATE TABLE _vfy_users;
  INSERT INTO _vfy_users(label, user_id) VALUES
    ('u1', u1),
    ('u2', u2);
  GRANT SELECT ON TABLE _vfy_users TO authenticated;

  -- Create roles
  IF has_role_name AND has_role_key AND has_role_code THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, key, code) VALUES ($1, $2, $3, $4) RETURNING id'
      INTO r_admin_a USING t_a, 'vfy_admin', 'vfy_admin', 'vfy_admin';
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, key, code) VALUES ($1, $2, $3, $4) RETURNING id'
      INTO r_user_b USING t_b, 'vfy_user', 'vfy_user', 'vfy_user';
  ELSIF has_role_name AND has_role_key THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, key) VALUES ($1, $2, $3) RETURNING id'
      INTO r_admin_a USING t_a, 'vfy_admin', 'vfy_admin';
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, key) VALUES ($1, $2, $3) RETURNING id'
      INTO r_user_b USING t_b, 'vfy_user', 'vfy_user';
  ELSIF has_role_name AND has_role_code THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, code) VALUES ($1, $2, $3) RETURNING id'
      INTO r_admin_a USING t_a, 'vfy_admin', 'vfy_admin';
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, code) VALUES ($1, $2, $3) RETURNING id'
      INTO r_user_b USING t_b, 'vfy_user', 'vfy_user';
  ELSIF has_role_key AND has_role_code THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, key, code) VALUES ($1, $2, $3) RETURNING id'
      INTO r_admin_a USING t_a, 'vfy_admin', 'vfy_admin';
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, key, code) VALUES ($1, $2, $3) RETURNING id'
      INTO r_user_b USING t_b, 'vfy_user', 'vfy_user';
  ELSIF has_role_name THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name) VALUES ($1, $2) RETURNING id'
      INTO r_admin_a USING t_a, 'vfy_admin';
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name) VALUES ($1, $2) RETURNING id'
      INTO r_user_b USING t_b, 'vfy_user';
  ELSIF has_role_key THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, key) VALUES ($1, $2) RETURNING id'
      INTO r_admin_a USING t_a, 'vfy_admin';
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, key) VALUES ($1, $2) RETURNING id'
      INTO r_user_b USING t_b, 'vfy_user';
  ELSIF has_role_code THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, code) VALUES ($1, $2) RETURNING id'
      INTO r_admin_a USING t_a, 'vfy_admin';
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, code) VALUES ($1, $2) RETURNING id'
      INTO r_user_b USING t_b, 'vfy_user';
  ELSE
    RAISE EXCEPTION 'sys_roles missing name/key/code';
  END IF;

  -- Permissions baseline (must exist from seed, but ensure)
  INSERT INTO public.sys_permissions(key, description) VALUES
    ('rbac.roles.write','roles write'),
    ('rbac.role_permissions.write','role_permissions write')
  ON CONFLICT (key) DO NOTHING;

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

  -- Grant admin permissions on tenant A role
  IF has_permission_id THEN
    SELECT id INTO p_roles_write_id FROM public.sys_permissions WHERE key = 'rbac.roles.write';
    SELECT id INTO p_role_perms_write_id FROM public.sys_permissions WHERE key = 'rbac.role_permissions.write';
    INSERT INTO public.sys_role_permissions(role_id, permission_id) VALUES
      (r_admin_a, p_roles_write_id),
      (r_admin_a, p_role_perms_write_id)
    ON CONFLICT DO NOTHING;
  ELSIF has_permission_key THEN
    INSERT INTO public.sys_role_permissions(role_id, permission_key) VALUES
      (r_admin_a, 'rbac.roles.write'),
      (r_admin_a, 'rbac.role_permissions.write')
    ON CONFLICT DO NOTHING;
  ELSE
    RAISE EXCEPTION 'sys_role_permissions missing permission_id/permission_key';
  END IF;

  -- Memberships: u1 in tenant A (admin), u2 in tenant B (non-admin)
  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_memberships'
      AND column_name = 'is_tenant_admin'
  ) INTO has_admin_col;

  IF has_admin_col THEN
    INSERT INTO public.sys_memberships(tenant_id, user_id, role_id, is_tenant_admin)
      VALUES (t_a, u1, r_admin_a, true);
    INSERT INTO public.sys_memberships(tenant_id, user_id, role_id, is_tenant_admin)
      VALUES (t_b, u2, r_user_b, false);
  ELSE
    INSERT INTO public.sys_memberships(tenant_id, user_id, role_id)
      VALUES (t_a, u1, r_admin_a);
    INSERT INTO public.sys_memberships(tenant_id, user_id, role_id)
      VALUES (t_b, u2, r_user_b);
  END IF;

END $$;

-- Switch to authenticated for tenant-isolation tests
SET LOCAL ROLE authenticated;

-- Simulate login as u1 (tenant A)
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM _vfy_users WHERE label='u1'))::text, true);

-- A) u1 can read own-tenant roles (should be >=1)
DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM public.sys_roles;
  IF c < 1 THEN RAISE EXCEPTION 'u1 cannot read own tenant roles (expected >=1, got %)', c; END IF;
END $$;

-- B) u1 cannot read tenant B roles (should be 0)
DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c
  FROM public.sys_roles r
  JOIN _vfy_tenants v ON v.tenant_id = r.tenant_id
  WHERE v.label = 'b';
  IF c <> 0 THEN RAISE EXCEPTION 'cross-tenant read leak: u1 saw tenant_b roles (% rows)', c; END IF;
END $$;

-- C) u1 cannot write into tenant B roles (must fail)
DO $$
DECLARE t_b uuid;
DECLARE has_role_name boolean;
DECLARE has_role_key boolean;
DECLARE has_role_code boolean;
BEGIN
  SELECT tenant_id INTO t_b FROM _vfy_tenants WHERE label = 'b';
  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_roles'
      AND column_name = 'name'
  ) INTO has_role_name;
  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_roles'
      AND column_name = 'key'
  ) INTO has_role_key;
  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_roles'
      AND column_name = 'code'
  ) INTO has_role_code;
  BEGIN
    IF has_role_name AND has_role_key AND has_role_code THEN
      EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, key, code) VALUES ($1, $2, $3, $4)'
        USING t_b, 'vfy_cross_write_attempt', 'vfy_cross_write_attempt', 'vfy_cross_write_attempt';
    ELSIF has_role_name AND has_role_key THEN
      EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, key) VALUES ($1, $2, $3)'
        USING t_b, 'vfy_cross_write_attempt', 'vfy_cross_write_attempt';
    ELSIF has_role_name AND has_role_code THEN
      EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, code) VALUES ($1, $2, $3)'
        USING t_b, 'vfy_cross_write_attempt', 'vfy_cross_write_attempt';
    ELSIF has_role_key AND has_role_code THEN
      EXECUTE 'INSERT INTO public.sys_roles(tenant_id, key, code) VALUES ($1, $2, $3)'
        USING t_b, 'vfy_cross_write_attempt', 'vfy_cross_write_attempt';
    ELSIF has_role_name THEN
      EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name) VALUES ($1, $2)'
        USING t_b, 'vfy_cross_write_attempt';
    ELSIF has_role_key THEN
      EXECUTE 'INSERT INTO public.sys_roles(tenant_id, key) VALUES ($1, $2)'
        USING t_b, 'vfy_cross_write_attempt';
    ELSIF has_role_code THEN
      EXECUTE 'INSERT INTO public.sys_roles(tenant_id, code) VALUES ($1, $2)'
        USING t_b, 'vfy_cross_write_attempt';
    ELSE
      RAISE EXCEPTION 'sys_roles missing name/key/code';
    END IF;
    RAISE EXCEPTION 'cross-tenant write was allowed (should be rejected)';
  EXCEPTION WHEN others THEN
    -- expected
    NULL;
  END;
END $$;

-- D) u1 can write into own tenant A roles only if permission exists (should succeed)
DO $$
DECLARE t_a uuid;
DECLARE has_role_name boolean;
DECLARE has_role_key boolean;
DECLARE has_role_code boolean;
BEGIN
  SELECT tenant_id INTO t_a FROM _vfy_tenants WHERE label = 'a';
  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_roles'
      AND column_name = 'name'
  ) INTO has_role_name;
  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_roles'
      AND column_name = 'key'
  ) INTO has_role_key;
  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_roles'
      AND column_name = 'code'
  ) INTO has_role_code;
  IF has_role_name AND has_role_key AND has_role_code THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, key, code) VALUES ($1, $2, $3, $4)'
      USING t_a, 'vfy_ok_write', 'vfy_ok_write', 'vfy_ok_write';
  ELSIF has_role_name AND has_role_key THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, key) VALUES ($1, $2, $3)'
      USING t_a, 'vfy_ok_write', 'vfy_ok_write';
  ELSIF has_role_name AND has_role_code THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, code) VALUES ($1, $2, $3)'
      USING t_a, 'vfy_ok_write', 'vfy_ok_write';
  ELSIF has_role_key AND has_role_code THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, key, code) VALUES ($1, $2, $3)'
      USING t_a, 'vfy_ok_write', 'vfy_ok_write';
  ELSIF has_role_name THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name) VALUES ($1, $2)'
      USING t_a, 'vfy_ok_write';
  ELSIF has_role_key THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, key) VALUES ($1, $2)'
      USING t_a, 'vfy_ok_write';
  ELSIF has_role_code THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, code) VALUES ($1, $2)'
      USING t_a, 'vfy_ok_write';
  ELSE
    RAISE EXCEPTION 'sys_roles missing name/key/code';
  END IF;
END $$;

-- Simulate login as u2 (tenant B)
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM _vfy_users WHERE label='u2'))::text, true);

-- E) u2 cannot read tenant A roles (should be 0)
DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c
  FROM public.sys_roles r
  JOIN _vfy_tenants v ON v.tenant_id = r.tenant_id
  WHERE v.label = 'a';
  IF c <> 0 THEN RAISE EXCEPTION 'cross-tenant read leak: u2 saw tenant_a roles (% rows)', c; END IF;
END $$;

COMMIT;

-- Final PASS marker
SELECT 'verify_stage2b=PASS' AS stage2b_verify;
