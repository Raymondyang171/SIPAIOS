-- Phase 1 Schema (V1.1) - Procurement & IQC (Q-lite)
-- Run after: 20260126_02_phase1_master_data.sql and 20260126_04_phase1_inventory.sql

begin;

-- ===== Purchase Orders =====
create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  supplier_id uuid not null references suppliers(id),
  po_no text not null,
  status purchase_order_status not null default 'draft',
  order_date date not null default current_date,
  promised_date date,

  -- external reconciliation
  source_system text,
  external_ref_id text,

  note text,
  created_at timestamptz not null default now(),
  unique(company_id, po_no)
);

create index if not exists idx_po_supplier on purchase_orders(supplier_id);

create table if not exists purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  line_no integer not null,
  item_id uuid not null references items(id),
  qty numeric(18,6) not null check (qty > 0),
  uom_id uuid not null references uoms(id),
  unit_price numeric(18,6),
  currency text,
  promised_date date,
  note text,
  created_at timestamptz not null default now(),
  unique(purchase_order_id, line_no)
);

create index if not exists idx_po_lines_po on purchase_order_lines(purchase_order_id);

-- ===== Goods Receipts (GRN) =====
create table if not exists goods_receipts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  site_id uuid not null references sites(id) on delete cascade,
  supplier_id uuid not null references suppliers(id),
  purchase_order_id uuid references purchase_orders(id),
  grn_no text not null,
  status goods_receipt_status not null default 'received',
  received_at timestamptz not null default now(),

  -- external reconciliation
  source_system text,
  external_ref_id text,

  note text,
  created_at timestamptz not null default now(),
  unique(company_id, grn_no)
);

create index if not exists idx_grn_supplier on goods_receipts(supplier_id);

create table if not exists goods_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  goods_receipt_id uuid not null references goods_receipts(id) on delete cascade,
  line_no integer not null,

  purchase_order_line_id uuid references purchase_order_lines(id),
  item_id uuid not null references items(id),

  qty_received numeric(18,6) not null check (qty_received > 0),
  uom_id uuid not null references uoms(id),

  -- receiving warehouse (often inspection warehouse)
  warehouse_id uuid not null references warehouses(id),

  -- optional lot created/assigned at receiving
  lot_id uuid references inventory_lots(id),

  note text,
  created_at timestamptz not null default now(),
  unique(goods_receipt_id, line_no)
);

create index if not exists idx_grn_lines_grn on goods_receipt_lines(goods_receipt_id);
create index if not exists idx_grn_lines_item on goods_receipt_lines(item_id);

-- ===== IQC (Q-lite) =====
create table if not exists iqc_records (
  id uuid primary key default gen_random_uuid(),
  goods_receipt_line_id uuid not null references goods_receipt_lines(id) on delete cascade,
  status iqc_status not null default 'pending',
  inspected_at timestamptz,
  inspector text,
  reason_code_id uuid references reason_codes(id),
  note text,
  created_at timestamptz not null default now(),
  unique(goods_receipt_line_id)
);

create index if not exists idx_iqc_status on iqc_records(status);

commit;
