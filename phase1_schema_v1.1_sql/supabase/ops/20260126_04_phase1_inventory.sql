-- Phase 1 Schema (V1.1) - Inventory / Lots / Moves
-- Run after: 20260126_02_phase1_master_data.sql

begin;

-- ===== Lots / Batches =====
create table if not exists inventory_lots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  item_id uuid not null references items(id),

  -- Lot identifiers
  lot_code text not null,
  lot_type text not null default 'supplier', -- 'supplier' | 'production'
  supplier_lot_code text,

  -- Dates (optional)
  mfg_date date,
  expiry_date date,
  received_at timestamptz,
  note text,

  created_at timestamptz not null default now(),
  unique(company_id, item_id, lot_code)
);

create index if not exists idx_inventory_lots_item on inventory_lots(item_id);

-- Lot-specific conversion override (e.g., stamping: kg -> pcs differs by coil)
create table if not exists lot_uom_conversions (
  id uuid primary key default gen_random_uuid(),
  lot_id uuid not null references inventory_lots(id) on delete cascade,
  from_uom_id uuid not null references uoms(id),
  to_uom_id uuid not null references uoms(id),
  ratio numeric(18,8) not null check (ratio > 0),
  note text,
  created_at timestamptz not null default now(),
  unique(lot_id, from_uom_id, to_uom_id)
);

-- ===== Inventory Balance (optional materialized balance) =====
-- Application can maintain this for fast reads; source of truth is inventory_move_lines.
create table if not exists inventory_balances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  warehouse_id uuid not null references warehouses(id) on delete cascade,
  item_id uuid not null references items(id),
  lot_id uuid references inventory_lots(id),

  qty numeric(18,6) not null default 0,
  uom_id uuid not null references uoms(id),

  updated_at timestamptz not null default now(),
  unique(company_id, site_id, warehouse_id, item_id, lot_id)
);

create index if not exists idx_inv_balances_lookup on inventory_balances(company_id, site_id, warehouse_id, item_id);

-- ===== Inventory Moves (event-driven ledger) =====
create table if not exists inventory_moves (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  move_type inventory_move_type not null,
  occurred_at timestamptz not null default now(),

  -- external reconciliation
  source_system text,
  external_ref_id text,
  external_ref_line_id text,

  -- documents
  doc_type text, -- e.g. 'GRN','WO','SO-SHIP','ADJ'
  doc_id uuid,
  note text,

  created_at timestamptz not null default now()
);

create index if not exists idx_inv_moves_company_time on inventory_moves(company_id, occurred_at desc);
create index if not exists idx_inv_moves_external on inventory_moves(source_system, external_ref_id);

create table if not exists inventory_move_lines (
  id uuid primary key default gen_random_uuid(),
  move_id uuid not null references inventory_moves(id) on delete cascade,

  item_id uuid not null references items(id),
  lot_id uuid references inventory_lots(id),

  -- movement between warehouses (either side may be null for issue/receipt)
  from_warehouse_id uuid references warehouses(id),
  to_warehouse_id uuid references warehouses(id),

  qty numeric(18,6) not null check (qty <> 0),
  uom_id uuid not null references uoms(id),

  reason_code_id uuid references reason_codes(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_inv_move_lines_move on inventory_move_lines(move_id);
create index if not exists idx_inv_move_lines_item on inventory_move_lines(item_id);
create index if not exists idx_inv_move_lines_lot on inventory_move_lines(lot_id);

commit;
