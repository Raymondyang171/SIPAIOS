-- Stage 2C-1: Company scope RLS (company_id == tenant_id)
BEGIN;

-- UOMs: add company scope column (nullable for Stage2C-1)
ALTER TABLE public.uoms
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_uoms_company_id ON public.uoms(company_id);

-- Enable RLS on all public tables (idempotent)
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backflush_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.backflush_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_headers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bom_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_move_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_moves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.iqc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_cycle_time_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_uom_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lot_uom_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reason_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sys_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- Privileges (plain Postgres needs GRANTs in addition to RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.audit_events,
  public.backflush_allocations,
  public.backflush_runs,
  public.bom_headers,
  public.bom_lines,
  public.bom_versions,
  public.companies,
  public.customers,
  public.goods_receipt_lines,
  public.goods_receipts,
  public.inventory_balances,
  public.inventory_lots,
  public.inventory_move_lines,
  public.inventory_moves,
  public.iqc_records,
  public.item_cycle_time_versions,
  public.item_uom_conversions,
  public.items,
  public.lot_uom_conversions,
  public.production_lots,
  public.production_schedules,
  public.purchase_order_lines,
  public.purchase_orders,
  public.reason_codes,
  public.sales_order_lines,
  public.sales_orders,
  public.shipment_lines,
  public.shipments,
  public.sites,
  public.suppliers,
  public.sys_idempotency_keys,
  public.uoms,
  public.warehouses,
  public.work_centers,
  public.work_order_events,
  public.work_orders
TO authenticated;

GRANT ALL PRIVILEGES ON TABLE
  public.audit_events,
  public.backflush_allocations,
  public.backflush_runs,
  public.bom_headers,
  public.bom_lines,
  public.bom_versions,
  public.companies,
  public.customers,
  public.goods_receipt_lines,
  public.goods_receipts,
  public.inventory_balances,
  public.inventory_lots,
  public.inventory_move_lines,
  public.inventory_moves,
  public.iqc_records,
  public.item_cycle_time_versions,
  public.item_uom_conversions,
  public.items,
  public.lot_uom_conversions,
  public.production_lots,
  public.production_schedules,
  public.purchase_order_lines,
  public.purchase_orders,
  public.reason_codes,
  public.sales_order_lines,
  public.sales_orders,
  public.shipment_lines,
  public.shipments,
  public.sites,
  public.suppliers,
  public.sys_idempotency_keys,
  public.uoms,
  public.warehouses,
  public.work_centers,
  public.work_order_events,
  public.work_orders
TO service_role;

-- ===== Policies: direct company_id =====
DROP POLICY IF EXISTS audit_events_company_isolation ON public.audit_events;
CREATE POLICY audit_events_company_isolation ON public.audit_events
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS bom_headers_company_isolation ON public.bom_headers;
CREATE POLICY bom_headers_company_isolation ON public.bom_headers
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS customers_company_isolation ON public.customers;
CREATE POLICY customers_company_isolation ON public.customers
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS goods_receipts_company_isolation ON public.goods_receipts;
CREATE POLICY goods_receipts_company_isolation ON public.goods_receipts
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS inventory_balances_company_isolation ON public.inventory_balances;
CREATE POLICY inventory_balances_company_isolation ON public.inventory_balances
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS inventory_lots_company_isolation ON public.inventory_lots;
CREATE POLICY inventory_lots_company_isolation ON public.inventory_lots
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS inventory_moves_company_isolation ON public.inventory_moves;
CREATE POLICY inventory_moves_company_isolation ON public.inventory_moves
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS item_cycle_time_versions_company_isolation ON public.item_cycle_time_versions;
CREATE POLICY item_cycle_time_versions_company_isolation ON public.item_cycle_time_versions
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS items_company_isolation ON public.items;
CREATE POLICY items_company_isolation ON public.items
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS production_lots_company_isolation ON public.production_lots;
CREATE POLICY production_lots_company_isolation ON public.production_lots
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS production_schedules_company_isolation ON public.production_schedules;
CREATE POLICY production_schedules_company_isolation ON public.production_schedules
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS purchase_orders_company_isolation ON public.purchase_orders;
CREATE POLICY purchase_orders_company_isolation ON public.purchase_orders
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS reason_codes_company_isolation ON public.reason_codes;
CREATE POLICY reason_codes_company_isolation ON public.reason_codes
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS sales_orders_company_isolation ON public.sales_orders;
CREATE POLICY sales_orders_company_isolation ON public.sales_orders
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS shipments_company_isolation ON public.shipments;
CREATE POLICY shipments_company_isolation ON public.shipments
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS sites_company_isolation ON public.sites;
CREATE POLICY sites_company_isolation ON public.sites
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS suppliers_company_isolation ON public.suppliers;
CREATE POLICY suppliers_company_isolation ON public.suppliers
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS sys_idempotency_keys_company_isolation ON public.sys_idempotency_keys;
CREATE POLICY sys_idempotency_keys_company_isolation ON public.sys_idempotency_keys
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (company_id IS NOT NULL AND public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS work_centers_company_isolation ON public.work_centers;
CREATE POLICY work_centers_company_isolation ON public.work_centers
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS work_orders_company_isolation ON public.work_orders;
CREATE POLICY work_orders_company_isolation ON public.work_orders
  FOR ALL TO authenticated
  USING (public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (public.is_tenant_member(company_id, auth.uid()));

DROP POLICY IF EXISTS companies_company_isolation ON public.companies;
CREATE POLICY companies_company_isolation ON public.companies
  FOR ALL TO authenticated
  USING (public.is_tenant_member(id, auth.uid()))
  WITH CHECK (public.is_tenant_member(id, auth.uid()));

DROP POLICY IF EXISTS uoms_company_isolation ON public.uoms;
CREATE POLICY uoms_company_isolation ON public.uoms
  FOR ALL TO authenticated
  USING (company_id IS NOT NULL AND public.is_tenant_member(company_id, auth.uid()))
  WITH CHECK (company_id IS NOT NULL AND public.is_tenant_member(company_id, auth.uid()));

-- ===== Policies: FK back to company =====
DROP POLICY IF EXISTS backflush_runs_company_isolation ON public.backflush_runs;
CREATE POLICY backflush_runs_company_isolation ON public.backflush_runs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.work_orders wo
      WHERE wo.id = work_order_id
        AND public.is_tenant_member(wo.company_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.work_orders wo
      WHERE wo.id = work_order_id
        AND public.is_tenant_member(wo.company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS backflush_allocations_company_isolation ON public.backflush_allocations;
CREATE POLICY backflush_allocations_company_isolation ON public.backflush_allocations
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.backflush_runs br
      JOIN public.work_orders wo ON wo.id = br.work_order_id
      WHERE br.id = backflush_run_id
        AND public.is_tenant_member(wo.company_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.backflush_runs br
      JOIN public.work_orders wo ON wo.id = br.work_order_id
      WHERE br.id = backflush_run_id
        AND public.is_tenant_member(wo.company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS bom_versions_company_isolation ON public.bom_versions;
CREATE POLICY bom_versions_company_isolation ON public.bom_versions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bom_headers bh
      WHERE bh.id = bom_header_id
        AND public.is_tenant_member(bh.company_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.bom_headers bh
      WHERE bh.id = bom_header_id
        AND public.is_tenant_member(bh.company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS bom_lines_company_isolation ON public.bom_lines;
CREATE POLICY bom_lines_company_isolation ON public.bom_lines
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.bom_versions bv
      JOIN public.bom_headers bh ON bh.id = bv.bom_header_id
      WHERE bv.id = bom_version_id
        AND public.is_tenant_member(bh.company_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.bom_versions bv
      JOIN public.bom_headers bh ON bh.id = bv.bom_header_id
      WHERE bv.id = bom_version_id
        AND public.is_tenant_member(bh.company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS goods_receipt_lines_company_isolation ON public.goods_receipt_lines;
CREATE POLICY goods_receipt_lines_company_isolation ON public.goods_receipt_lines
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.goods_receipts gr
      WHERE gr.id = goods_receipt_id
        AND public.is_tenant_member(gr.company_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.goods_receipts gr
      WHERE gr.id = goods_receipt_id
        AND public.is_tenant_member(gr.company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS inventory_move_lines_company_isolation ON public.inventory_move_lines;
CREATE POLICY inventory_move_lines_company_isolation ON public.inventory_move_lines
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.inventory_moves im
      WHERE im.id = move_id
        AND public.is_tenant_member(im.company_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.inventory_moves im
      WHERE im.id = move_id
        AND public.is_tenant_member(im.company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS iqc_records_company_isolation ON public.iqc_records;
CREATE POLICY iqc_records_company_isolation ON public.iqc_records
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.goods_receipt_lines grl
      JOIN public.goods_receipts gr ON gr.id = grl.goods_receipt_id
      WHERE grl.id = goods_receipt_line_id
        AND public.is_tenant_member(gr.company_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.goods_receipt_lines grl
      JOIN public.goods_receipts gr ON gr.id = grl.goods_receipt_id
      WHERE grl.id = goods_receipt_line_id
        AND public.is_tenant_member(gr.company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS item_uom_conversions_company_isolation ON public.item_uom_conversions;
CREATE POLICY item_uom_conversions_company_isolation ON public.item_uom_conversions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.items i
      WHERE i.id = item_id
        AND public.is_tenant_member(i.company_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.items i
      WHERE i.id = item_id
        AND public.is_tenant_member(i.company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS lot_uom_conversions_company_isolation ON public.lot_uom_conversions;
CREATE POLICY lot_uom_conversions_company_isolation ON public.lot_uom_conversions
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.inventory_lots l
      WHERE l.id = lot_id
        AND public.is_tenant_member(l.company_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.inventory_lots l
      WHERE l.id = lot_id
        AND public.is_tenant_member(l.company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS purchase_order_lines_company_isolation ON public.purchase_order_lines;
CREATE POLICY purchase_order_lines_company_isolation ON public.purchase_order_lines
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      WHERE po.id = purchase_order_id
        AND public.is_tenant_member(po.company_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.purchase_orders po
      WHERE po.id = purchase_order_id
        AND public.is_tenant_member(po.company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS sales_order_lines_company_isolation ON public.sales_order_lines;
CREATE POLICY sales_order_lines_company_isolation ON public.sales_order_lines
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sales_orders so
      WHERE so.id = sales_order_id
        AND public.is_tenant_member(so.company_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sales_orders so
      WHERE so.id = sales_order_id
        AND public.is_tenant_member(so.company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS shipment_lines_company_isolation ON public.shipment_lines;
CREATE POLICY shipment_lines_company_isolation ON public.shipment_lines
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.shipments s
      WHERE s.id = shipment_id
        AND public.is_tenant_member(s.company_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.shipments s
      WHERE s.id = shipment_id
        AND public.is_tenant_member(s.company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS warehouses_company_isolation ON public.warehouses;
CREATE POLICY warehouses_company_isolation ON public.warehouses
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sites s
      WHERE s.id = site_id
        AND public.is_tenant_member(s.company_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sites s
      WHERE s.id = site_id
        AND public.is_tenant_member(s.company_id, auth.uid())
    )
  );

DROP POLICY IF EXISTS work_order_events_company_isolation ON public.work_order_events;
CREATE POLICY work_order_events_company_isolation ON public.work_order_events
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.work_orders wo
      WHERE wo.id = work_order_id
        AND public.is_tenant_member(wo.company_id, auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.work_orders wo
      WHERE wo.id = work_order_id
        AND public.is_tenant_member(wo.company_id, auth.uid())
    )
  );

-- ===== Service role bypass =====
DROP POLICY IF EXISTS audit_events_service_role_all ON public.audit_events;
CREATE POLICY audit_events_service_role_all ON public.audit_events
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS backflush_allocations_service_role_all ON public.backflush_allocations;
CREATE POLICY backflush_allocations_service_role_all ON public.backflush_allocations
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS backflush_runs_service_role_all ON public.backflush_runs;
CREATE POLICY backflush_runs_service_role_all ON public.backflush_runs
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS bom_headers_service_role_all ON public.bom_headers;
CREATE POLICY bom_headers_service_role_all ON public.bom_headers
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS bom_lines_service_role_all ON public.bom_lines;
CREATE POLICY bom_lines_service_role_all ON public.bom_lines
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS bom_versions_service_role_all ON public.bom_versions;
CREATE POLICY bom_versions_service_role_all ON public.bom_versions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS companies_service_role_all ON public.companies;
CREATE POLICY companies_service_role_all ON public.companies
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS customers_service_role_all ON public.customers;
CREATE POLICY customers_service_role_all ON public.customers
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS goods_receipt_lines_service_role_all ON public.goods_receipt_lines;
CREATE POLICY goods_receipt_lines_service_role_all ON public.goods_receipt_lines
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS goods_receipts_service_role_all ON public.goods_receipts;
CREATE POLICY goods_receipts_service_role_all ON public.goods_receipts
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS inventory_balances_service_role_all ON public.inventory_balances;
CREATE POLICY inventory_balances_service_role_all ON public.inventory_balances
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS inventory_lots_service_role_all ON public.inventory_lots;
CREATE POLICY inventory_lots_service_role_all ON public.inventory_lots
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS inventory_move_lines_service_role_all ON public.inventory_move_lines;
CREATE POLICY inventory_move_lines_service_role_all ON public.inventory_move_lines
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS inventory_moves_service_role_all ON public.inventory_moves;
CREATE POLICY inventory_moves_service_role_all ON public.inventory_moves
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS iqc_records_service_role_all ON public.iqc_records;
CREATE POLICY iqc_records_service_role_all ON public.iqc_records
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS item_cycle_time_versions_service_role_all ON public.item_cycle_time_versions;
CREATE POLICY item_cycle_time_versions_service_role_all ON public.item_cycle_time_versions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS item_uom_conversions_service_role_all ON public.item_uom_conversions;
CREATE POLICY item_uom_conversions_service_role_all ON public.item_uom_conversions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS items_service_role_all ON public.items;
CREATE POLICY items_service_role_all ON public.items
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS lot_uom_conversions_service_role_all ON public.lot_uom_conversions;
CREATE POLICY lot_uom_conversions_service_role_all ON public.lot_uom_conversions
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS production_lots_service_role_all ON public.production_lots;
CREATE POLICY production_lots_service_role_all ON public.production_lots
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS production_schedules_service_role_all ON public.production_schedules;
CREATE POLICY production_schedules_service_role_all ON public.production_schedules
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS purchase_order_lines_service_role_all ON public.purchase_order_lines;
CREATE POLICY purchase_order_lines_service_role_all ON public.purchase_order_lines
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS purchase_orders_service_role_all ON public.purchase_orders;
CREATE POLICY purchase_orders_service_role_all ON public.purchase_orders
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS reason_codes_service_role_all ON public.reason_codes;
CREATE POLICY reason_codes_service_role_all ON public.reason_codes
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sales_order_lines_service_role_all ON public.sales_order_lines;
CREATE POLICY sales_order_lines_service_role_all ON public.sales_order_lines
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sales_orders_service_role_all ON public.sales_orders;
CREATE POLICY sales_orders_service_role_all ON public.sales_orders
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS shipment_lines_service_role_all ON public.shipment_lines;
CREATE POLICY shipment_lines_service_role_all ON public.shipment_lines
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS shipments_service_role_all ON public.shipments;
CREATE POLICY shipments_service_role_all ON public.shipments
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sites_service_role_all ON public.sites;
CREATE POLICY sites_service_role_all ON public.sites
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS suppliers_service_role_all ON public.suppliers;
CREATE POLICY suppliers_service_role_all ON public.suppliers
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS sys_idempotency_keys_service_role_all ON public.sys_idempotency_keys;
CREATE POLICY sys_idempotency_keys_service_role_all ON public.sys_idempotency_keys
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS uoms_service_role_all ON public.uoms;
CREATE POLICY uoms_service_role_all ON public.uoms
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS warehouses_service_role_all ON public.warehouses;
CREATE POLICY warehouses_service_role_all ON public.warehouses
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS work_centers_service_role_all ON public.work_centers;
CREATE POLICY work_centers_service_role_all ON public.work_centers
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS work_order_events_service_role_all ON public.work_order_events;
CREATE POLICY work_order_events_service_role_all ON public.work_order_events
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS work_orders_service_role_all ON public.work_orders;
CREATE POLICY work_orders_service_role_all ON public.work_orders
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
