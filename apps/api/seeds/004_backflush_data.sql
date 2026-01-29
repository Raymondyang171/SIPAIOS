-- Seed: Test data for APP-007 Backflush (Production Report with FIFO material consumption)
-- Creates: Released MO, Raw material lots, Inventory balances for backflush testing
-- Requires: 003_production_mo_data.sql (for BOM), 002_purchase_test_data.sql (for item, warehouse)

BEGIN;

-- Fixed UUIDs for Backflush test data
-- UUID scheme: 00000000-0000-0000-0000-0000000006XX for backflush-related
--   601 = released work order for backflush
--   602 = raw material lot 1 (older, FIFO first)
--   603 = raw material lot 2 (newer, FIFO second)
--   604 = another released MO (insufficient stock test)

-- Reference IDs from previous seeds:
-- DEMO company: 9b8444cb-d8cb-58d7-8322-22d5c95892a1
-- Site: 00000000-0000-0000-0000-000000000201
-- Warehouse: 00000000-0000-0000-0000-000000000301
-- Raw material ITEM-001: 00000000-0000-0000-0000-000000000401
-- FG item FG-001: 00000000-0000-0000-0000-000000000501
-- BOM version: 00000000-0000-0000-0000-000000000503
-- UOM (PCS): 00000000-0000-0000-0000-000000000001

-- 1. Create inventory lots for raw material (ITEM-001) with different received_at for FIFO
INSERT INTO public.inventory_lots (id, company_id, item_id, lot_code, lot_type, supplier_lot_code, received_at, note)
VALUES
  ('00000000-0000-0000-0000-000000000602', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', '00000000-0000-0000-0000-000000000401', 'LOT-RAW-001', 'supplier', 'SUP-LOT-A', now() - interval '2 days', 'First lot for FIFO test'),
  ('00000000-0000-0000-0000-000000000603', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', '00000000-0000-0000-0000-000000000401', 'LOT-RAW-002', 'supplier', 'SUP-LOT-B', now() - interval '1 day', 'Second lot for FIFO test')
ON CONFLICT (company_id, item_id, lot_code) DO UPDATE SET received_at = EXCLUDED.received_at, note = EXCLUDED.note;

-- 2. Create inventory balances for raw material lots
-- Lot 1: 30 pcs (older, will be consumed first)
-- Lot 2: 50 pcs (newer, will be consumed second if needed)
INSERT INTO public.inventory_balances (id, company_id, site_id, warehouse_id, item_id, lot_id, qty, uom_id)
VALUES
  ('00000000-0000-0000-0000-000000000610', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000602', 30.000000, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000611', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000603', 50.000000, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (company_id, site_id, warehouse_id, item_id, lot_id) DO UPDATE SET qty = EXCLUDED.qty;

-- 3. Create a released work order for backflush testing
-- Produces 20 units of FG-001, requires 20 units of ITEM-001 (1:1 ratio from BOM line 510)
INSERT INTO public.work_orders (id, company_id, site_id, wo_no, item_id, planned_qty, uom_id, bom_version_id, status, primary_warehouse_id, note)
VALUES ('00000000-0000-0000-0000-000000000601', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', '00000000-0000-0000-0000-000000000201', 'WO-BACKFLUSH-001', '00000000-0000-0000-0000-000000000501', 20.000000, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000503', 'released', '00000000-0000-0000-0000-000000000301', 'Released MO for backflush test')
ON CONFLICT (company_id, wo_no) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note;

-- 4. Create another released work order with insufficient stock scenario
-- Produces 100 units of FG-001, requires 100 units of ITEM-001 (but only 80 available)
INSERT INTO public.work_orders (id, company_id, site_id, wo_no, item_id, planned_qty, uom_id, bom_version_id, status, primary_warehouse_id, note)
VALUES ('00000000-0000-0000-0000-000000000604', '9b8444cb-d8cb-58d7-8322-22d5c95892a1', '00000000-0000-0000-0000-000000000201', 'WO-BACKFLUSH-002', '00000000-0000-0000-0000-000000000501', 100.000000, '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000503', 'released', '00000000-0000-0000-0000-000000000301', 'MO with insufficient stock for negative test')
ON CONFLICT (company_id, wo_no) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note;

COMMIT;
