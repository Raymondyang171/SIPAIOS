-- Phase 1 Schema (V1.1) - Master Data
-- Run after: 20260126_01_phase1_extensions_and_types.sql

begin;

-- ===== Tenancy / Sites =====
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique(company_id, code)
);

create table if not exists warehouses (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references sites(id) on delete cascade,
  code text not null,
  name text not null,
  category warehouse_category not null default 'normal',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique(site_id, code)
);

create index if not exists idx_warehouses_site on warehouses(site_id);

-- ===== Units of Measure =====
create table if not exists uoms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

-- ===== Parties =====
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique(company_id, code)
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique(company_id, code)
);

create index if not exists idx_customers_company on customers(company_id);
create index if not exists idx_suppliers_company on suppliers(company_id);

-- ===== Items =====
create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  item_no text not null,
  name text not null,
  item_type item_type not null,
  base_uom_id uuid not null references uoms(id),

  -- V1.1 decisions
  key_material boolean not null default false, -- maintained by Engineering/QA
  lot_tracking lot_tracking_mode not null default 'none',

  -- optional attributes
  spec text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  unique(company_id, item_no),
  constraint ck_key_material_lot_mode check (
    (key_material = false) or (lot_tracking in ('optional','required'))
  )
);

create index if not exists idx_items_company on items(company_id);
create index if not exists idx_items_type on items(item_type);

-- ===== Item UoM Conversions (standard) =====
-- Use for estimates and for conversions between procurement/production units.
create table if not exists item_uom_conversions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  from_uom_id uuid not null references uoms(id),
  to_uom_id uuid not null references uoms(id),
  ratio numeric(18,8) not null check (ratio > 0),
  note text,
  effective_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(item_id, from_uom_id, to_uom_id, effective_at)
);

create index if not exists idx_item_uom_conv_item on item_uom_conversions(item_id);

-- ===== Reason Codes (shared) =====
create table if not exists reason_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  code text not null,
  name text not null,
  category text not null, -- e.g. 'ng_reason','scrap','iqc_reject','adjust'
  created_at timestamptz not null default now(),
  unique(company_id, category, code)
);

create index if not exists idx_reason_codes_company on reason_codes(company_id);

commit;
