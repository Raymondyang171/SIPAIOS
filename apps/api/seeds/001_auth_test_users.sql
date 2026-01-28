-- Seed: Test users for APP-01 Auth Skeleton
-- Password for all test users: Test@123
-- Hash generated with bcrypt (cost 10)

BEGIN;

-- Add password_hash column if not exists
ALTER TABLE public.sys_users ADD COLUMN IF NOT EXISTS password_hash text;

-- Fixed UUIDs for test users (reproducible for Postman tests)
-- admin@demo.local - Admin user for DEMO company
-- user@demo.local - Regular user for DEMO company
-- multi@demo.local - User with access to multiple companies

-- Ensure DEMO company exists with matching tenant
INSERT INTO public.sys_tenants (id, slug, name)
VALUES ('9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'demo-com-001', 'DEMO companies')
ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name;

INSERT INTO public.companies (id, code, name)
VALUES ('9b8444cb-d8cb-58d7-8322-22d5c95892a1', 'DEMO-COM-001', 'DEMO companies')
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name;

-- Create a second company for multi-company testing
INSERT INTO public.sys_tenants (id, slug, name)
VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002', 'test-com-002', 'Test Company 2')
ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, name = EXCLUDED.name;

INSERT INTO public.companies (id, code, name)
VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002', 'TEST-COM-002', 'Test Company 2')
ON CONFLICT (id) DO UPDATE SET code = EXCLUDED.code, name = EXCLUDED.name;

-- Insert test users
-- Password: Test@123 (bcrypt hash with cost 10)
INSERT INTO public.sys_users (id, email, display_name, password_hash)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@demo.local', 'Demo Admin', '$2b$10$MzmQ4WYwTCgeqdSne.lwCuty3rC78AJ9pJtM1YPr7QlXK8haqL5Ia'),
  ('22222222-2222-2222-2222-222222222222', 'user@demo.local', 'Demo User', '$2b$10$MzmQ4WYwTCgeqdSne.lwCuty3rC78AJ9pJtM1YPr7QlXK8haqL5Ia'),
  ('33333333-3333-3333-3333-333333333333', 'multi@demo.local', 'Multi-Company User', '$2b$10$MzmQ4WYwTCgeqdSne.lwCuty3rC78AJ9pJtM1YPr7QlXK8haqL5Ia')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  password_hash = EXCLUDED.password_hash;

-- Create memberships
-- admin@demo.local -> DEMO company (tenant admin)
INSERT INTO public.sys_memberships (id, tenant_id, user_id, is_tenant_admin)
VALUES ('aaaa1111-1111-1111-1111-111111111111', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', '11111111-1111-1111-1111-111111111111', true)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET is_tenant_admin = EXCLUDED.is_tenant_admin;

-- user@demo.local -> DEMO company (regular user)
INSERT INTO public.sys_memberships (id, tenant_id, user_id, is_tenant_admin)
VALUES ('aaaa2222-2222-2222-2222-222222222222', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', '22222222-2222-2222-2222-222222222222', false)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET is_tenant_admin = EXCLUDED.is_tenant_admin;

-- multi@demo.local -> DEMO company + Test Company 2
INSERT INTO public.sys_memberships (id, tenant_id, user_id, is_tenant_admin)
VALUES
  ('aaaa3333-3333-3333-3333-333333333331', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', '33333333-3333-3333-3333-333333333333', false),
  ('aaaa3333-3333-3333-3333-333333333332', 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002', '33333333-3333-3333-3333-333333333333', true)
ON CONFLICT (tenant_id, user_id) DO UPDATE SET is_tenant_admin = EXCLUDED.is_tenant_admin;

COMMIT;
