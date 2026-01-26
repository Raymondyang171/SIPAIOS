-- Phase 1 Schema (V1.1) - BOM (versioned, append-only)
-- Run after: 20260126_02_phase1_master_data.sql

begin;

create table if not exists bom_headers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  fg_item_id uuid not null references items(id),
  code text,
  created_at timestamptz not null default now(),
  unique(company_id, fg_item_id)
);

create table if not exists bom_versions (
  id uuid primary key default gen_random_uuid(),
  bom_header_id uuid not null references bom_headers(id) on delete cascade,
  version_no integer not null,
  status bom_status not null default 'draft',
  effective_from timestamptz not null default now(),
  note text,
  created_at timestamptz not null default now(),
  unique(bom_header_id, version_no)
);

create index if not exists idx_bom_versions_header on bom_versions(bom_header_id);

create table if not exists bom_lines (
  id uuid primary key default gen_random_uuid(),
  bom_version_id uuid not null references bom_versions(id) on delete cascade,
  line_no integer not null,
  component_item_id uuid not null references items(id),
  qty_per numeric(18,6) not null check (qty_per > 0),
  uom_id uuid not null references uoms(id),
  scrap_factor numeric(9,6) not null default 0 check (scrap_factor >= 0),
  note text,
  created_at timestamptz not null default now(),
  unique(bom_version_id, line_no)
);

create index if not exists idx_bom_lines_version on bom_lines(bom_version_id);
create index if not exists idx_bom_lines_component on bom_lines(component_item_id);

commit;
