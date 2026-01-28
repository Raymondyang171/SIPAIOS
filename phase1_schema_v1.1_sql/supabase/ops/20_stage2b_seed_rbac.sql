-- Stage 2B — Seed minimal permissions (idempotent)

insert into public.sys_permissions(key, description)
values
  ('rbac.roles.write', 'Manage roles and role-permission mapping'),
  ('rbac.memberships.read', 'Read memberships in own tenant'),
  ('rbac.memberships.write', 'Manage memberships in own tenant')
on conflict (key) do update set description = excluded.description;
