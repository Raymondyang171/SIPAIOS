# APP-02 Gate Summary & Demo Walkthrough

> Generated: 2026-01-31 | Updated: 2026-01-31 (SVC-OPS-014)
> Tag: `demo-ok-20260130-app02-app05`
> Commit: `9211cb1`

---

## Gate Summary

| Field | Value |
|-------|-------|
| Gate | APP-02 |
| Timestamp (UTC) | 20260130T181826Z |
| DB Container | sipaios-postgres |
| Newman Gate | **PASS** |
| Gate Result | **PASS** |
| Run Directory | `artifacts/gate/app02/20260130T181826Z/` |

### Artifacts

- `01_replay.log` - DB replay log
- `02_seed.log` - Seed data log
- `03_newman.log` - Newman test output
- `04_summary.txt` - Gate summary
- `newman-results.json` - Full Newman results (405KB)

---

## Demo Walkthrough Checklist

Follow this checklist to verify the system after gate pass and demo reset.

### Prerequisites

- [ ] Gate passed (see summary above)
- [ ] Demo reset completed: `scripts/demo_reset_after_gate.sh`
- [ ] Web app running: `pnpm --filter web dev`
- [ ] API backend running

### 1. Login Flow

- [ ] Navigate to `/production/login`
- [ ] Enter test credentials
- [ ] Verify redirect to Dashboard (or Work Orders)
- [ ] Verify Sidebar shows: Dashboard, Work Orders, Purchase, Inventory, Reports

### 2. Dashboard Verification

**Acceptance Criteria**: At least 2 of 3 widgets must display a real numeric value (or `N+` if truncated).

- [ ] Navigate to `/production/dashboard`
- [ ] **Pending Work Orders**: Shows numeric count (e.g., `3`) or `N+`
  - Data source: `/api/work-orders` → filters `status` ∈ {PENDING, IN_PROGRESS, RELEASED}
- [ ] **Open Purchase Orders**: Shows numeric count (e.g., `5`) or `N+`
  - Data source: `/api/purchase-orders` → filters `status` ∈ {DRAFT, APPROVED, CONFIRMED}
- [ ] **Low Stock Alerts**: Shows "Not available" with tooltip explanation
  - Note: No data source configured yet; acceptable as N/A for this gate
- [ ] On API failure: Widget shows `N/A` + `Retry` link (no page crash)
- [ ] Click Quick Action: "Create Purchase Order" → redirects to `/purchase/orders/create`

### 3. Work Order Detail Flow

- [ ] Navigate to `/production/work-orders`
- [ ] Verify work order list loads
- [ ] Click any work order row
- [ ] Verify detail page shows: Header (WO#, status), Tabs
- [ ] Click "Material Precheck" tab
- [ ] Verify material list with availability status

### 4. Purchase Order Flow

- [ ] Navigate to `/purchase/orders/create`
- [ ] Fill form: Select supplier, site, add line item
- [ ] Submit → verify success message
- [ ] Navigate to `/purchase/orders`
- [ ] Verify new PO appears in list
- [ ] Click PO row → verify detail page

### 5. GRN (Goods Receipt Note) Flow

- [ ] From PO detail page, click "Create GRN" button
- [ ] Fill GRN form: Received qty
- [ ] Submit → verify success
- [ ] Verify GRN appears in PO detail

### 6. Reports & Navigation

- [ ] Navigate to `/production/reports`
- [ ] Verify Reports Hub loads
- [ ] Click "Work Order Summary" → navigates to work orders
- [ ] Click "Purchase Order History" → navigates to purchase orders
- [ ] Verify Demo Walkthrough section visible

### 7. Inventory Page

- [ ] Navigate to `/production/inventory`
- [ ] Verify Inventory Overview page loads
- [ ] Verify navigation cards present
- [ ] Click "Go to Work Orders" → redirects correctly

### 8. Logout

- [ ] Click Logout in header
- [ ] Verify redirect to login page
- [ ] Verify protected routes redirect to login when accessed directly

---

## Rollback Commands

If issues occur, rollback with:

```bash
# Revert UI changes
git restore apps/web/app/production/(shell)/shell.tsx apps/web/app/purchase/layout.tsx
rm -rf apps/web/app/production/(shell)/dashboard apps/web/app/production/(shell)/inventory apps/web/app/production/(shell)/reports

# Revert this file
rm -rf doc/snapshots
```

---

## Related Files

- Gate artifacts: `artifacts/gate/app02/20260130T181826Z/`
- Demo reset script: `scripts/demo_reset_after_gate.sh`
- Demo reset docs: `scripts/demo_reset_after_gate.md`
