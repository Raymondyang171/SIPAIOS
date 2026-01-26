-- Phase 1 Schema (V1.1) - Audit Trails & Cross-links
-- Run after all prior Phase 1 schema files.

begin;

-- Generic audit log for "allowed with audit trail" corrections
create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  occurred_at timestamptz not null default now(),
  actor_user_id uuid,
  actor_name text,

  entity_type text not null, -- e.g. 'backflush_allocations','inventory_move_lines','iqc_records','work_orders'
  entity_id uuid,
  action text not null,      -- e.g. 'create','update','reallocate','reverse','void'
  reason text,
  before_state jsonb,
  after_state jsonb,

  created_at timestamptz not null default now()
);

create index if not exists idx_audit_company_time on audit_events(company_id, occurred_at desc);
create index if not exists idx_audit_entity on audit_events(entity_type, entity_id);

-- Cross-links for drill-down (optional; populated by app)
-- 1) Link GRN -> inventory move
alter table goods_receipts
  add column if not exists posted_inventory_move_id uuid;

-- 2) Link production receipt -> inventory move
alter table production_lots
  add column if not exists fg_receipt_move_id uuid;

-- 3) Link backflush run -> inventory move(s)
alter table backflush_runs
  add column if not exists posted_inventory_move_id uuid,
  add column if not exists reversed_inventory_move_id uuid;

commit;
