-- Phase 1 Schema (V1.1) - Extensions & Types
-- Safe to run multiple times.

begin;

-- Extensions
create extension if not exists pgcrypto;

-- ===== Enums / Types =====

do $$
begin
  if not exists (select 1 from pg_type where typname = 'item_type') then
    create type item_type as enum ('material','wip','fg','service');
  end if;

  if not exists (select 1 from pg_type where typname = 'lot_tracking_mode') then
    create type lot_tracking_mode as enum ('none','optional','required');
  end if;

  if not exists (select 1 from pg_type where typname = 'warehouse_category') then
    create type warehouse_category as enum ('normal','inspection','rework','scrap','quarantine');
  end if;

  if not exists (select 1 from pg_type where typname = 'bom_status') then
    create type bom_status as enum ('draft','active','obsolete');
  end if;

  if not exists (select 1 from pg_type where typname = 'work_order_status') then
    create type work_order_status as enum ('draft','released','in_progress','completed','void');
  end if;

  if not exists (select 1 from pg_type where typname = 'work_order_event_type') then
    create type work_order_event_type as enum (
      'release','start','pause','resume','complete','void',
      'fg_receipt','wip_receipt','scrap','rework','return_material','adjust'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'purchase_order_status') then
    create type purchase_order_status as enum ('draft','sent','partial','closed','cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'goods_receipt_status') then
    create type goods_receipt_status as enum ('draft','received','iqc_pending','released','rejected','closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'iqc_status') then
    create type iqc_status as enum ('pending','accepted','rejected','quarantined');
  end if;

  if not exists (select 1 from pg_type where typname = 'sales_order_status') then
    create type sales_order_status as enum ('draft','confirmed','partial','shipped','closed','cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'inventory_move_type') then
    create type inventory_move_type as enum (
      'grn_receipt','issue','backflush_issue','return','transfer','adjust','shipment'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'schedule_status') then
    create type schedule_status as enum ('planned','firm','done','cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'backflush_status') then
    create type backflush_status as enum ('pending','posted','reversed');
  end if;
end $$;

commit;
