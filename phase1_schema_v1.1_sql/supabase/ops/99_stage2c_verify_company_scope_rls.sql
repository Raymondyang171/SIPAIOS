-- Stage 2C-1 verify: company scope isolation (authenticated) + service_role bypass
BEGIN;

-- Setup uses service_role to bypass RLS
SET LOCAL ROLE service_role;

DO $$
DECLARE
  t_a uuid;
  t_b uuid;
  u_a uuid := gen_random_uuid();
  u_b uuid := gen_random_uuid();
  r_a uuid;
  r_b uuid;
  has_tenant_slug boolean;
  has_tenant_name boolean;
  has_tenant_code boolean;
  has_user_email boolean;
  has_user_display_name boolean;
  has_role_name boolean;
  has_role_key boolean;
  has_role_code boolean;
  has_admin_col boolean;
BEGIN
  -- Cleanup previous verify data
  DELETE FROM public.sales_orders WHERE so_no LIKE 'vfy2c_%';
  DELETE FROM public.purchase_orders WHERE po_no LIKE 'vfy2c_%';
  DELETE FROM public.items WHERE item_no LIKE 'vfy2c_%';
  DELETE FROM public.uoms WHERE code LIKE 'vfy2c_%';
  DELETE FROM public.customers WHERE code LIKE 'vfy2c_%';
  DELETE FROM public.suppliers WHERE code LIKE 'vfy2c_%';
  DELETE FROM public.sites WHERE code LIKE 'vfy2c_%';
  DELETE FROM public.companies WHERE code LIKE 'vfy2c_%';

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
    EXECUTE 'DELETE FROM public.sys_memberships m WHERE m.user_id IN (SELECT id FROM public.sys_users WHERE email LIKE ''vfy2c_%'')';
    EXECUTE 'DELETE FROM public.sys_users u WHERE u.email LIKE ''vfy2c_%''';
  ELSIF has_user_display_name THEN
    EXECUTE 'DELETE FROM public.sys_memberships m WHERE m.user_id IN (SELECT id FROM public.sys_users WHERE display_name LIKE ''vfy2c_%'')';
    EXECUTE 'DELETE FROM public.sys_users u WHERE u.display_name LIKE ''vfy2c_%''';
  END IF;

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
    EXECUTE 'DELETE FROM public.sys_role_permissions rp WHERE rp.role_id IN (SELECT id FROM public.sys_roles WHERE name LIKE ''vfy2c_%'')';
    EXECUTE 'DELETE FROM public.sys_roles r WHERE r.name LIKE ''vfy2c_%''';
  ELSIF has_role_key THEN
    EXECUTE 'DELETE FROM public.sys_role_permissions rp WHERE rp.role_id IN (SELECT id FROM public.sys_roles WHERE key LIKE ''vfy2c_%'')';
    EXECUTE 'DELETE FROM public.sys_roles r WHERE r.key LIKE ''vfy2c_%''';
  ELSIF has_role_code THEN
    EXECUTE 'DELETE FROM public.sys_role_permissions rp WHERE rp.role_id IN (SELECT id FROM public.sys_roles WHERE code LIKE ''vfy2c_%'')';
    EXECUTE 'DELETE FROM public.sys_roles r WHERE r.code LIKE ''vfy2c_%''';
  ELSE
    RAISE EXCEPTION 'sys_roles missing name/key/code';
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
    EXECUTE 'DELETE FROM public.sys_tenants t WHERE t.slug LIKE ''vfy2c_%''';
  ELSIF has_tenant_code THEN
    EXECUTE 'DELETE FROM public.sys_tenants t WHERE t.code LIKE ''vfy2c_%''';
  ELSIF has_tenant_name THEN
    EXECUTE 'DELETE FROM public.sys_tenants t WHERE t.name LIKE ''vfy2c_%''';
  END IF;

  -- Seed two tenants (IDs reused as company IDs)
  IF has_tenant_slug AND has_tenant_code AND has_tenant_name THEN
    EXECUTE 'INSERT INTO public.sys_tenants(slug, code, name) VALUES ($1, $2, $3) RETURNING id'
      INTO t_a USING 'vfy2c_tenant_a', 'vfy2c_tenant_a', 'vfy2c_tenant_a';
    EXECUTE 'INSERT INTO public.sys_tenants(slug, code, name) VALUES ($1, $2, $3) RETURNING id'
      INTO t_b USING 'vfy2c_tenant_b', 'vfy2c_tenant_b', 'vfy2c_tenant_b';
  ELSIF has_tenant_slug AND has_tenant_code THEN
    EXECUTE 'INSERT INTO public.sys_tenants(slug, code) VALUES ($1, $2) RETURNING id'
      INTO t_a USING 'vfy2c_tenant_a', 'vfy2c_tenant_a';
    EXECUTE 'INSERT INTO public.sys_tenants(slug, code) VALUES ($1, $2) RETURNING id'
      INTO t_b USING 'vfy2c_tenant_b', 'vfy2c_tenant_b';
  ELSIF has_tenant_slug AND has_tenant_name THEN
    EXECUTE 'INSERT INTO public.sys_tenants(slug, name) VALUES ($1, $2) RETURNING id'
      INTO t_a USING 'vfy2c_tenant_a', 'vfy2c_tenant_a';
    EXECUTE 'INSERT INTO public.sys_tenants(slug, name) VALUES ($1, $2) RETURNING id'
      INTO t_b USING 'vfy2c_tenant_b', 'vfy2c_tenant_b';
  ELSIF has_tenant_code AND has_tenant_name THEN
    EXECUTE 'INSERT INTO public.sys_tenants(code, name) VALUES ($1, $2) RETURNING id'
      INTO t_a USING 'vfy2c_tenant_a', 'vfy2c_tenant_a';
    EXECUTE 'INSERT INTO public.sys_tenants(code, name) VALUES ($1, $2) RETURNING id'
      INTO t_b USING 'vfy2c_tenant_b', 'vfy2c_tenant_b';
  ELSIF has_tenant_slug THEN
    EXECUTE 'INSERT INTO public.sys_tenants(slug) VALUES ($1) RETURNING id'
      INTO t_a USING 'vfy2c_tenant_a';
    EXECUTE 'INSERT INTO public.sys_tenants(slug) VALUES ($1) RETURNING id'
      INTO t_b USING 'vfy2c_tenant_b';
  ELSIF has_tenant_code THEN
    EXECUTE 'INSERT INTO public.sys_tenants(code) VALUES ($1) RETURNING id'
      INTO t_a USING 'vfy2c_tenant_a';
    EXECUTE 'INSERT INTO public.sys_tenants(code) VALUES ($1) RETURNING id'
      INTO t_b USING 'vfy2c_tenant_b';
  ELSIF has_tenant_name THEN
    EXECUTE 'INSERT INTO public.sys_tenants(name) VALUES ($1) RETURNING id'
      INTO t_a USING 'vfy2c_tenant_a';
    EXECUTE 'INSERT INTO public.sys_tenants(name) VALUES ($1) RETURNING id'
      INTO t_b USING 'vfy2c_tenant_b';
  ELSE
    RAISE EXCEPTION 'sys_tenants missing slug/name/code';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _vfy2c_tenants(
    label text PRIMARY KEY,
    tenant_id uuid
  );
  TRUNCATE TABLE _vfy2c_tenants;
  INSERT INTO _vfy2c_tenants(label, tenant_id) VALUES
    ('a', t_a),
    ('b', t_b);
  GRANT SELECT ON TABLE _vfy2c_tenants TO authenticated;

  -- Seed companies with IDs matching tenant IDs
  INSERT INTO public.companies(id, code, name) VALUES
    (t_a, 'vfy2c_company_a', 'vfy2c_company_a'),
    (t_b, 'vfy2c_company_b', 'vfy2c_company_b');

  -- Seed roles per tenant (used by memberships)
  IF has_role_name AND has_role_key AND has_role_code THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, key, code) VALUES ($1, $2, $3, $4) RETURNING id'
      INTO r_a USING t_a, 'vfy2c_role_a', 'vfy2c_role_a', 'vfy2c_role_a';
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, key, code) VALUES ($1, $2, $3, $4) RETURNING id'
      INTO r_b USING t_b, 'vfy2c_role_b', 'vfy2c_role_b', 'vfy2c_role_b';
  ELSIF has_role_name AND has_role_key THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, key) VALUES ($1, $2, $3) RETURNING id'
      INTO r_a USING t_a, 'vfy2c_role_a', 'vfy2c_role_a';
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, key) VALUES ($1, $2, $3) RETURNING id'
      INTO r_b USING t_b, 'vfy2c_role_b', 'vfy2c_role_b';
  ELSIF has_role_name AND has_role_code THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, code) VALUES ($1, $2, $3) RETURNING id'
      INTO r_a USING t_a, 'vfy2c_role_a', 'vfy2c_role_a';
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name, code) VALUES ($1, $2, $3) RETURNING id'
      INTO r_b USING t_b, 'vfy2c_role_b', 'vfy2c_role_b';
  ELSIF has_role_key AND has_role_code THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, key, code) VALUES ($1, $2, $3) RETURNING id'
      INTO r_a USING t_a, 'vfy2c_role_a', 'vfy2c_role_a';
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, key, code) VALUES ($1, $2, $3) RETURNING id'
      INTO r_b USING t_b, 'vfy2c_role_b', 'vfy2c_role_b';
  ELSIF has_role_name THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name) VALUES ($1, $2) RETURNING id'
      INTO r_a USING t_a, 'vfy2c_role_a';
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, name) VALUES ($1, $2) RETURNING id'
      INTO r_b USING t_b, 'vfy2c_role_b';
  ELSIF has_role_key THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, key) VALUES ($1, $2) RETURNING id'
      INTO r_a USING t_a, 'vfy2c_role_a';
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, key) VALUES ($1, $2) RETURNING id'
      INTO r_b USING t_b, 'vfy2c_role_b';
  ELSIF has_role_code THEN
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, code) VALUES ($1, $2) RETURNING id'
      INTO r_a USING t_a, 'vfy2c_role_a';
    EXECUTE 'INSERT INTO public.sys_roles(tenant_id, code) VALUES ($1, $2) RETURNING id'
      INTO r_b USING t_b, 'vfy2c_role_b';
  ELSE
    RAISE EXCEPTION 'sys_roles missing name/key/code';
  END IF;

  -- Seed verify users
  IF has_user_email AND has_user_display_name THEN
    EXECUTE 'INSERT INTO public.sys_users(id, email, display_name) VALUES ($1, $2, $3)'
      USING u_a, 'vfy2c_uA@local', 'vfy2c_uA';
    EXECUTE 'INSERT INTO public.sys_users(id, email, display_name) VALUES ($1, $2, $3)'
      USING u_b, 'vfy2c_uB@local', 'vfy2c_uB';
  ELSIF has_user_email THEN
    EXECUTE 'INSERT INTO public.sys_users(id, email) VALUES ($1, $2)'
      USING u_a, 'vfy2c_uA@local';
    EXECUTE 'INSERT INTO public.sys_users(id, email) VALUES ($1, $2)'
      USING u_b, 'vfy2c_uB@local';
  ELSIF has_user_display_name THEN
    EXECUTE 'INSERT INTO public.sys_users(id, display_name) VALUES ($1, $2)'
      USING u_a, 'vfy2c_uA';
    EXECUTE 'INSERT INTO public.sys_users(id, display_name) VALUES ($1, $2)'
      USING u_b, 'vfy2c_uB';
  ELSE
    RAISE EXCEPTION 'sys_users missing email/display_name';
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS _vfy2c_users(
    label text PRIMARY KEY,
    user_id uuid
  );
  TRUNCATE TABLE _vfy2c_users;
  INSERT INTO _vfy2c_users(label, user_id) VALUES
    ('uA', u_a),
    ('uB', u_b);
  GRANT SELECT ON TABLE _vfy2c_users TO authenticated;

  SELECT EXISTS(
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_memberships'
      AND column_name = 'is_tenant_admin'
  ) INTO has_admin_col;

  IF has_admin_col THEN
    INSERT INTO public.sys_memberships(tenant_id, user_id, role_id, is_tenant_admin)
      VALUES (t_a, u_a, r_a, true);
    INSERT INTO public.sys_memberships(tenant_id, user_id, role_id, is_tenant_admin)
      VALUES (t_b, u_b, r_b, true);
  ELSE
    INSERT INTO public.sys_memberships(tenant_id, user_id, role_id)
      VALUES (t_a, u_a, r_a);
    INSERT INTO public.sys_memberships(tenant_id, user_id, role_id)
      VALUES (t_b, u_b, r_b);
  END IF;

  -- Seed per-company UOMs
  INSERT INTO public.uoms(id, code, name, company_id) VALUES
    (gen_random_uuid(), 'vfy2c_uom_a', 'vfy2c_uom_a', t_a),
    (gen_random_uuid(), 'vfy2c_uom_b', 'vfy2c_uom_b', t_b);

  CREATE TEMP TABLE IF NOT EXISTS _vfy2c_uoms(
    label text PRIMARY KEY,
    uom_id uuid
  );
  TRUNCATE TABLE _vfy2c_uoms;
  INSERT INTO _vfy2c_uoms(label, uom_id)
    SELECT CASE WHEN company_id = t_a THEN 'a' ELSE 'b' END, id
    FROM public.uoms
    WHERE code IN ('vfy2c_uom_a','vfy2c_uom_b');
  GRANT SELECT ON TABLE _vfy2c_uoms TO authenticated;

  -- Seed per-company core entities
  INSERT INTO public.sites(id, company_id, code, name) VALUES
    (gen_random_uuid(), t_a, 'vfy2c_site_a', 'vfy2c_site_a'),
    (gen_random_uuid(), t_b, 'vfy2c_site_b', 'vfy2c_site_b');

  INSERT INTO public.customers(id, company_id, code, name) VALUES
    (gen_random_uuid(), t_a, 'vfy2c_cust_a', 'vfy2c_cust_a'),
    (gen_random_uuid(), t_b, 'vfy2c_cust_b', 'vfy2c_cust_b');

  INSERT INTO public.suppliers(id, company_id, code, name) VALUES
    (gen_random_uuid(), t_a, 'vfy2c_sup_a', 'vfy2c_sup_a'),
    (gen_random_uuid(), t_b, 'vfy2c_sup_b', 'vfy2c_sup_b');

  CREATE TEMP TABLE IF NOT EXISTS _vfy2c_sites(
    label text PRIMARY KEY,
    site_id uuid
  );
  TRUNCATE TABLE _vfy2c_sites;
  INSERT INTO _vfy2c_sites(label, site_id)
    SELECT CASE WHEN company_id = t_a THEN 'a' ELSE 'b' END, id
    FROM public.sites
    WHERE code IN ('vfy2c_site_a','vfy2c_site_b');
  GRANT SELECT ON TABLE _vfy2c_sites TO authenticated;

  CREATE TEMP TABLE IF NOT EXISTS _vfy2c_customers(
    label text PRIMARY KEY,
    customer_id uuid
  );
  TRUNCATE TABLE _vfy2c_customers;
  INSERT INTO _vfy2c_customers(label, customer_id)
    SELECT CASE WHEN company_id = t_a THEN 'a' ELSE 'b' END, id
    FROM public.customers
    WHERE code IN ('vfy2c_cust_a','vfy2c_cust_b');
  GRANT SELECT ON TABLE _vfy2c_customers TO authenticated;

  CREATE TEMP TABLE IF NOT EXISTS _vfy2c_suppliers(
    label text PRIMARY KEY,
    supplier_id uuid
  );
  TRUNCATE TABLE _vfy2c_suppliers;
  INSERT INTO _vfy2c_suppliers(label, supplier_id)
    SELECT CASE WHEN company_id = t_a THEN 'a' ELSE 'b' END, id
    FROM public.suppliers
    WHERE code IN ('vfy2c_sup_a','vfy2c_sup_b');
  GRANT SELECT ON TABLE _vfy2c_suppliers TO authenticated;

  -- Items (need base_uom_id)
  INSERT INTO public.items(id, company_id, item_no, name, item_type, base_uom_id)
    VALUES
    (gen_random_uuid(), t_a, 'vfy2c_item_a', 'vfy2c_item_a', 'fg', (SELECT uom_id FROM _vfy2c_uoms WHERE label='a')),
    (gen_random_uuid(), t_b, 'vfy2c_item_b', 'vfy2c_item_b', 'fg', (SELECT uom_id FROM _vfy2c_uoms WHERE label='b'));

  CREATE TEMP TABLE IF NOT EXISTS _vfy2c_items(
    label text PRIMARY KEY,
    item_id uuid
  );
  TRUNCATE TABLE _vfy2c_items;
  INSERT INTO _vfy2c_items(label, item_id)
    SELECT CASE WHEN company_id = t_a THEN 'a' ELSE 'b' END, id
    FROM public.items
    WHERE item_no IN ('vfy2c_item_a','vfy2c_item_b');
  GRANT SELECT ON TABLE _vfy2c_items TO authenticated;

  -- Sales orders + lines
  INSERT INTO public.sales_orders(id, company_id, site_id, customer_id, so_no)
    VALUES
    (gen_random_uuid(), t_a, (SELECT site_id FROM _vfy2c_sites WHERE label='a'), (SELECT customer_id FROM _vfy2c_customers WHERE label='a'), 'vfy2c_so_a'),
    (gen_random_uuid(), t_b, (SELECT site_id FROM _vfy2c_sites WHERE label='b'), (SELECT customer_id FROM _vfy2c_customers WHERE label='b'), 'vfy2c_so_b');

  CREATE TEMP TABLE IF NOT EXISTS _vfy2c_sales_orders(
    label text PRIMARY KEY,
    so_id uuid
  );
  TRUNCATE TABLE _vfy2c_sales_orders;
  INSERT INTO _vfy2c_sales_orders(label, so_id)
    SELECT CASE WHEN company_id = t_a THEN 'a' ELSE 'b' END, id
    FROM public.sales_orders
    WHERE so_no IN ('vfy2c_so_a','vfy2c_so_b');
  GRANT SELECT ON TABLE _vfy2c_sales_orders TO authenticated;

  INSERT INTO public.sales_order_lines(id, sales_order_id, line_no, item_id, qty, uom_id)
    VALUES
    (gen_random_uuid(), (SELECT so_id FROM _vfy2c_sales_orders WHERE label='a'), 1, (SELECT item_id FROM _vfy2c_items WHERE label='a'), 1, (SELECT uom_id FROM _vfy2c_uoms WHERE label='a')),
    (gen_random_uuid(), (SELECT so_id FROM _vfy2c_sales_orders WHERE label='b'), 1, (SELECT item_id FROM _vfy2c_items WHERE label='b'), 1, (SELECT uom_id FROM _vfy2c_uoms WHERE label='b'));

  -- Purchase orders + lines
  INSERT INTO public.purchase_orders(id, company_id, site_id, supplier_id, po_no)
    VALUES
    (gen_random_uuid(), t_a, (SELECT site_id FROM _vfy2c_sites WHERE label='a'), (SELECT supplier_id FROM _vfy2c_suppliers WHERE label='a'), 'vfy2c_po_a'),
    (gen_random_uuid(), t_b, (SELECT site_id FROM _vfy2c_sites WHERE label='b'), (SELECT supplier_id FROM _vfy2c_suppliers WHERE label='b'), 'vfy2c_po_b');

  CREATE TEMP TABLE IF NOT EXISTS _vfy2c_purchase_orders(
    label text PRIMARY KEY,
    po_id uuid
  );
  TRUNCATE TABLE _vfy2c_purchase_orders;
  INSERT INTO _vfy2c_purchase_orders(label, po_id)
    SELECT CASE WHEN company_id = t_a THEN 'a' ELSE 'b' END, id
    FROM public.purchase_orders
    WHERE po_no IN ('vfy2c_po_a','vfy2c_po_b');
  GRANT SELECT ON TABLE _vfy2c_purchase_orders TO authenticated;

  INSERT INTO public.purchase_order_lines(id, purchase_order_id, line_no, item_id, qty, uom_id)
    VALUES
    (gen_random_uuid(), (SELECT po_id FROM _vfy2c_purchase_orders WHERE label='a'), 1, (SELECT item_id FROM _vfy2c_items WHERE label='a'), 1, (SELECT uom_id FROM _vfy2c_uoms WHERE label='a')),
    (gen_random_uuid(), (SELECT po_id FROM _vfy2c_purchase_orders WHERE label='b'), 1, (SELECT item_id FROM _vfy2c_items WHERE label='b'), 1, (SELECT uom_id FROM _vfy2c_uoms WHERE label='b'));

END $$;

-- ===== Authenticated checks =====
SET LOCAL ROLE authenticated;

-- Simulate login as userA (tenant/company A)
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM _vfy2c_users WHERE label='uA'))::text, true);

DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM public.items WHERE company_id = (SELECT tenant_id FROM _vfy2c_tenants WHERE label='a');
  IF c < 1 THEN RAISE EXCEPTION 'uA cannot read own company items (expected >=1, got %)', c; END IF;
END $$;

DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM public.items WHERE company_id = (SELECT tenant_id FROM _vfy2c_tenants WHERE label='b');
  IF c <> 0 THEN RAISE EXCEPTION 'uA saw cross-company items (% rows)', c; END IF;
END $$;

DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM public.uoms WHERE company_id = (SELECT tenant_id FROM _vfy2c_tenants WHERE label='b');
  IF c <> 0 THEN RAISE EXCEPTION 'uA saw cross-company uoms (% rows)', c; END IF;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.items(company_id, item_no, name, item_type, base_uom_id)
      VALUES (
        (SELECT tenant_id FROM _vfy2c_tenants WHERE label='b'),
        'vfy2c_cross_item',
        'vfy2c_cross_item',
        'fg',
        (SELECT uom_id FROM _vfy2c_uoms WHERE label='b')
      );
    RAISE EXCEPTION 'uA unexpectedly inserted cross-company item';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    NULL;
  END;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.purchase_orders(company_id, site_id, supplier_id, po_no)
      VALUES (
        (SELECT tenant_id FROM _vfy2c_tenants WHERE label='b'),
        (SELECT site_id FROM _vfy2c_sites WHERE label='b'),
        (SELECT supplier_id FROM _vfy2c_suppliers WHERE label='b'),
        'vfy2c_cross_po'
      );
    RAISE EXCEPTION 'uA unexpectedly inserted cross-company PO';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    NULL;
  END;
END $$;

DO $$
BEGIN
  INSERT INTO public.items(company_id, item_no, name, item_type, base_uom_id)
    VALUES (
      (SELECT tenant_id FROM _vfy2c_tenants WHERE label='a'),
      'vfy2c_item_a2',
      'vfy2c_item_a2',
      'fg',
      (SELECT uom_id FROM _vfy2c_uoms WHERE label='a')
    );
END $$;

-- Simulate login as userB (tenant/company B)
SELECT set_config('request.jwt.claims', json_build_object('sub', (SELECT user_id FROM _vfy2c_users WHERE label='uB'))::text, true);

DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM public.sales_orders WHERE company_id = (SELECT tenant_id FROM _vfy2c_tenants WHERE label='b');
  IF c < 1 THEN RAISE EXCEPTION 'uB cannot read own company sales_orders (expected >=1, got %)', c; END IF;
END $$;

DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM public.sales_orders WHERE company_id = (SELECT tenant_id FROM _vfy2c_tenants WHERE label='a');
  IF c <> 0 THEN RAISE EXCEPTION 'uB saw cross-company sales_orders (% rows)', c; END IF;
END $$;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.sales_orders(company_id, site_id, customer_id, so_no)
      VALUES (
        (SELECT tenant_id FROM _vfy2c_tenants WHERE label='a'),
        (SELECT site_id FROM _vfy2c_sites WHERE label='a'),
        (SELECT customer_id FROM _vfy2c_customers WHERE label='a'),
        'vfy2c_cross_so'
      );
    RAISE EXCEPTION 'uB unexpectedly inserted cross-company SO';
  EXCEPTION WHEN insufficient_privilege OR raise_exception THEN
    NULL;
  END;
END $$;

-- ===== Service role bypass =====
SET LOCAL ROLE service_role;

DO $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM public.items WHERE item_no LIKE 'vfy2c_%';
  IF c < 2 THEN RAISE EXCEPTION 'service_role missing multi-company visibility (expected >=2 items, got %)', c; END IF;
END $$;

COMMIT;
