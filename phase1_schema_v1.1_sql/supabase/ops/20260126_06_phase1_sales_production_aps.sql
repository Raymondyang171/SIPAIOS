-- Phase 1 Schema (V1.1) - Sales, Production (MES-lite), APS
-- Run after: 20260126_02_phase1_master_data.sql, 03_bom.sql, 04_inventory.sql

begin;

-- ===== Sales Orders =====
create table if not exists sales_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  customer_id uuid not null references customers(id),
  so_no text not null,
  status sales_order_status not null default 'draft',
  order_date date not null default current_date,
  promised_date date,

  -- external reconciliation
  source_system text,
  external_ref_id text,

  note text,
  created_at timestamptz not null default now(),
  unique(company_id, so_no)
);

create index if not exists idx_so_customer on sales_orders(customer_id);

create table if not exists sales_order_lines (
  id uuid primary key default gen_random_uuid(),
  sales_order_id uuid not null references sales_orders(id) on delete cascade,
  line_no integer not null,
  item_id uuid not null references items(id),
  qty numeric(18,6) not null check (qty > 0),
  uom_id uuid not null references uoms(id),
  promised_date date,
  note text,
  created_at timestamptz not null default now(),
  unique(sales_order_id, line_no)
);

create index if not exists idx_so_lines_so on sales_order_lines(sales_order_id);

-- ===== Shipments =====
create table if not exists shipments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  customer_id uuid not null references customers(id),
  sales_order_id uuid references sales_orders(id),
  ship_no text not null,
  shipped_at timestamptz,

  -- external reconciliation
  source_system text,
  external_ref_id text,

  note text,
  created_at timestamptz not null default now(),
  unique(company_id, ship_no)
);

create table if not exists shipment_lines (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references shipments(id) on delete cascade,
  line_no integer not null,
  sales_order_line_id uuid references sales_order_lines(id),
  item_id uuid not null references items(id),
  lot_id uuid references inventory_lots(id),
  qty numeric(18,6) not null check (qty > 0),
  uom_id uuid not null references uoms(id),
  from_warehouse_id uuid not null references warehouses(id),
  note text,
  created_at timestamptz not null default now(),
  unique(shipment_id, line_no)
);

create index if not exists idx_ship_lines_ship on shipment_lines(shipment_id);

-- ===== Work Centers / Machines =====
create table if not exists work_centers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  code text not null,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(company_id, site_id, code)
);

create index if not exists idx_work_centers_site on work_centers(site_id);

-- Cycle time is versioned because it can change by tooling/parameters/material/manpower.
create table if not exists item_cycle_time_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  item_id uuid not null references items(id),
  work_center_id uuid not null references work_centers(id),
  version_no integer not null,
  cycle_time_sec integer not null check (cycle_time_sec > 0),
  effective_from timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  unique(company_id, item_id, work_center_id, version_no)
);

create index if not exists idx_cycle_time_item_wc on item_cycle_time_versions(item_id, work_center_id);

-- ===== Work Orders =====
create table if not exists work_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,

  wo_no text not null,
  item_id uuid not null references items(id), -- FG (or WIP in stamping stages)
  planned_qty numeric(18,6) not null check (planned_qty > 0),
  uom_id uuid not null references uoms(id),

  -- Evidence lock: WO binds to BOM version
  bom_version_id uuid not null references bom_versions(id),

  status work_order_status not null default 'draft',

  -- Warehouse for standard issue/receipt (usually normal warehouse)
  primary_warehouse_id uuid not null references warehouses(id),

  scheduled_start timestamptz,
  scheduled_end timestamptz,
  released_at timestamptz,
  completed_at timestamptz,

  -- external reconciliation
  source_system text,
  external_ref_id text,

  note text,
  created_at timestamptz not null default now(),
  unique(company_id, wo_no)
);

create index if not exists idx_wo_status on work_orders(status);
create index if not exists idx_wo_item on work_orders(item_id);

-- Work order events are the source of truth for status changes and drill-down evidence.
create table if not exists work_order_events (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  event_type work_order_event_type not null,
  occurred_at timestamptz not null default now(),
  payload jsonb,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists idx_wo_events_wo on work_order_events(work_order_id, occurred_at);

-- ===== Production Lots =====
-- FG lots are mandatory in V1.1 (Assembly: always have FG lot).
create table if not exists production_lots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  work_order_id uuid not null references work_orders(id) on delete cascade,
  fg_lot_id uuid not null references inventory_lots(id),
  produced_at timestamptz not null default now(),
  qty numeric(18,6) not null check (qty > 0),
  uom_id uuid not null references uoms(id),
  note text,
  created_at timestamptz not null default now(),
  unique(work_order_id, fg_lot_id)
);

create index if not exists idx_prod_lots_wo on production_lots(work_order_id);

-- ===== Backflush =====
-- Backflush is the default for Assembly. Key materials are lot-allocated FIFO by GRN time.
create table if not exists backflush_runs (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references work_orders(id) on delete cascade,
  production_lot_id uuid not null references production_lots(id) on delete cascade,
  status backflush_status not null default 'pending',
  occurred_at timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  unique(production_lot_id)
);

create table if not exists backflush_allocations (
  id uuid primary key default gen_random_uuid(),
  backflush_run_id uuid not null references backflush_runs(id) on delete cascade,
  component_item_id uuid not null references items(id),
  component_lot_id uuid references inventory_lots(id), -- required for key_material components (enforced by app)
  qty numeric(18,6) not null check (qty > 0),
  uom_id uuid not null references uoms(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_backflush_alloc_run on backflush_allocations(backflush_run_id);

-- ===== APS Schedule =====
create table if not exists production_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  work_center_id uuid not null references work_centers(id),
  work_order_id uuid not null references work_orders(id) on delete cascade,

  start_at timestamptz not null,
  end_at timestamptz not null,
  seq integer not null,
  status schedule_status not null default 'planned',

  -- which cycle time version was used when planning
  cycle_time_version_id uuid references item_cycle_time_versions(id),

  note text,
  created_at timestamptz not null default now(),
  unique(company_id, work_center_id, work_order_id, seq)
);

create index if not exists idx_sched_wc_time on production_schedules(work_center_id, start_at);
create index if not exists idx_sched_wo on production_schedules(work_order_id);

commit;
