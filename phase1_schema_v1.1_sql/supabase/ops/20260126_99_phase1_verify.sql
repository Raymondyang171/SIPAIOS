-- Phase 1 Schema (V1.1) - Verify

-- List key tables
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'companies','sites','warehouses','uoms','items','item_uom_conversions','reason_codes',
    'bom_headers','bom_versions','bom_lines',
    'inventory_lots','lot_uom_conversions','inventory_balances','inventory_moves','inventory_move_lines',
    'purchase_orders','purchase_order_lines','goods_receipts','goods_receipt_lines','iqc_records',
    'customers','sales_orders','sales_order_lines','shipments','shipment_lines',
    'work_centers','item_cycle_time_versions','work_orders','work_order_events','production_lots',
    'backflush_runs','backflush_allocations','production_schedules',
    'audit_events'
  )
order by table_name;

-- Sanity check: enum types
select t.typname as enum_name, e.enumlabel as value
from pg_type t
join pg_enum e on t.oid = e.enumtypid
where t.typname in (
  'item_type','lot_tracking_mode','warehouse_category','bom_status','work_order_status',
  'work_order_event_type','purchase_order_status','goods_receipt_status','iqc_status',
  'sales_order_status','inventory_move_type','schedule_status','backflush_status'
)
order by enum_name, e.enumsortorder;
