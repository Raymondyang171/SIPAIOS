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

-- UOM company-scope checks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'uoms'
      AND column_name = 'company_id'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'uoms.company_id missing or nullable';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uoms_company_id_fkey'
      AND conrelid = 'public.uoms'::regclass
  ) THEN
    RAISE EXCEPTION 'uoms_company_id_fkey missing';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'uoms_company_id_code_key'
      AND conrelid = 'public.uoms'::regclass
      AND contype = 'u'
  ) THEN
    RAISE EXCEPTION 'uoms_company_id_code_key missing';
  END IF;
END $$;

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

-- ============================================================
-- SVC-APP-021B: DEMO company master data minimum row counts
-- Asserts that after replay, API endpoints will have data
-- ============================================================

DO $$
DECLARE
  v_company_id uuid;
  v_count integer;
BEGIN
  -- Get DEMO company ID
  SELECT id INTO v_company_id FROM public.companies WHERE code = 'DEMO-COM-001';
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'DEMO company not found (code=DEMO-COM-001)';
  END IF;

  -- Check suppliers >= 1
  SELECT COUNT(*) INTO v_count FROM public.suppliers WHERE company_id = v_company_id;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'DEMO suppliers count % < 1', v_count;
  END IF;
  RAISE NOTICE 'DEMO suppliers: %', v_count;

  -- Check sites >= 1
  SELECT COUNT(*) INTO v_count FROM public.sites WHERE company_id = v_company_id;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'DEMO sites count % < 1', v_count;
  END IF;
  RAISE NOTICE 'DEMO sites: %', v_count;

  -- Check warehouses >= 1 (via sites)
  SELECT COUNT(*) INTO v_count
  FROM public.warehouses w
  JOIN public.sites s ON w.site_id = s.id
  WHERE s.company_id = v_company_id;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'DEMO warehouses count % < 1', v_count;
  END IF;
  RAISE NOTICE 'DEMO warehouses: %', v_count;

  -- Check uoms >= 1
  SELECT COUNT(*) INTO v_count FROM public.uoms WHERE company_id = v_company_id;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'DEMO uoms count % < 1', v_count;
  END IF;
  RAISE NOTICE 'DEMO uoms: %', v_count;

  -- Check items >= 1
  SELECT COUNT(*) INTO v_count FROM public.items WHERE company_id = v_company_id;
  IF v_count < 1 THEN
    RAISE EXCEPTION 'DEMO items count % < 1', v_count;
  END IF;
  RAISE NOTICE 'DEMO items: %', v_count;

  RAISE NOTICE 'DEMO master data verification PASSED';
END $$;
