# SVC-APP-021B: UI → API → DB Wiring Matrix

> **Version**: 1.0
> **Date**: 2026-02-01
> **Status**: Active
> **Related SVC**: SVC-APP-021C

---

## 1. Purpose

本文件記錄 SIP AIOS 系統各功能模組的完整路徑對照：
- UI Route (Next.js Web)
- Web Proxy Route (Next.js API Routes)
- Express API Route
- Database Objects

供開發者與維運人員快速定位問題。

---

## 2. Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Browser       │────>│   Next.js Web   │────>│   Express API   │────>│   PostgreSQL    │
│   (UI)          │     │   (Proxy)       │     │   (Backend)     │     │   (Database)    │
│   :3000         │     │   :3000/api/*   │     │   :3001/*       │     │   :55432        │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## 3. Wiring Matrix

### 3.1 Health & Authentication

| UI Route | Web Proxy | API Route | HTTP Method | DB Objects | Notes |
|----------|-----------|-----------|-------------|------------|-------|
| - | `/api/health` | `/health` | GET | - | Health check, no auth |
| `/login` | `/api/proxy/login` | `/login` | POST | `sys_users`, `sys_user_companies` | Returns JWT token |
| - | `/api/proxy/switch-company` | `/switch-company` | POST | `sys_user_companies`, `companies` | Switch active company |
| Shell (Logout) | `/api/auth/logout` | - | POST | - | Clears httpOnly cookie |

### 3.2 Master Data - Suppliers

| UI Route | Web Proxy | API Route | HTTP Method | DB Objects | Notes |
|----------|-----------|-----------|-------------|------------|-------|
| `/production/suppliers` | `/api/proxy/suppliers` | `/suppliers` | GET | `suppliers` | List all suppliers |
| `/production/suppliers` | `/api/proxy/suppliers` | `/suppliers` | POST | `suppliers` | Create supplier |
| `/production/suppliers/[id]` | `/api/proxy/suppliers/[id]` | `/suppliers/:id` | GET | `suppliers` | Get by ID |
| `/production/suppliers/[id]` | `/api/proxy/suppliers/[id]` | `/suppliers/:id` | PUT | `suppliers` | Update supplier |
| `/production/suppliers/[id]` | `/api/proxy/suppliers/[id]` | `/suppliers/:id` | DELETE | `suppliers` | Delete supplier |

### 3.3 Master Data - UOMs (Units of Measure)

| UI Route | Web Proxy | API Route | HTTP Method | DB Objects | Notes |
|----------|-----------|-----------|-------------|------------|-------|
| `/production/uoms` | `/api/proxy/uoms` | `/uoms` | GET | `uoms` | List all UOMs |
| `/production/uoms` | `/api/proxy/uoms` | `/uoms` | POST | `uoms` | Create UOM |
| `/production/uoms/[id]` | `/api/proxy/uoms/[id]` | `/uoms/:id` | GET | `uoms` | Get by ID |
| `/production/uoms/[id]` | `/api/proxy/uoms/[id]` | `/uoms/:id` | PUT | `uoms` | Update UOM |
| `/production/uoms/[id]` | `/api/proxy/uoms/[id]` | `/uoms/:id` | DELETE | `uoms` | Delete UOM |

### 3.4 Master Data - Items

| UI Route | Web Proxy | API Route | HTTP Method | DB Objects | Notes |
|----------|-----------|-----------|-------------|------------|-------|
| `/production/items` | `/api/proxy/items` | `/items` | GET | `items` | List all items |
| `/production/items` | `/api/proxy/items` | `/items` | POST | `items` | Create item |
| `/production/items/[id]` | `/api/proxy/items/[id]` | `/items/:id` | GET | `items` | Get by ID |
| `/production/items/[id]` | `/api/proxy/items/[id]` | `/items/:id` | PUT | `items` | Update item |
| `/production/items/[id]` | `/api/proxy/items/[id]` | `/items/:id` | DELETE | `items` | Delete item |

### 3.5 Purchase Module

| UI Route | Web Proxy | API Route | HTTP Method | DB Objects | Notes |
|----------|-----------|-----------|-------------|------------|-------|
| `/purchase/orders` | `/api/proxy/purchase-orders` | `/purchase-orders` | GET | `purchase_orders`, `purchase_order_lines` | List POs |
| `/purchase/orders/create` | `/api/proxy/purchase-orders` | `/purchase-orders` | POST | `purchase_orders`, `purchase_order_lines` | Create PO |
| `/purchase/orders/[id]` | `/api/proxy/purchase-orders/[id]` | `/purchase-orders/:id` | GET | `purchase_orders`, `purchase_order_lines` | Get PO detail |
| - | `/api/proxy/grn` | `/grn` | POST | `goods_receipt_notes`, `grn_lines`, `inventory_transactions` | Create GRN |

### 3.6 Production Module - Work Orders

| UI Route | Web Proxy | API Route | HTTP Method | DB Objects | Notes |
|----------|-----------|-----------|-------------|------------|-------|
| `/production/work-orders` | `/api/proxy/work-orders` | `/work-orders` | GET | `work_orders` | List MOs |
| `/production/work-orders` | `/api/proxy/work-orders` | `/work-orders` | POST | `work_orders` | Create MO |
| `/production/work-orders/[id]` | `/api/proxy/work-orders/[id]` | `/work-orders/:id` | GET | `work_orders`, `production_reports` | Get MO detail |
| `/production/work-orders/[id]` | `/api/proxy/work-orders/[id]` | `/work-orders/:id` | PUT | `work_orders` | Update MO |

### 3.7 Production Module - BOMs

| UI Route | Web Proxy | API Route | HTTP Method | DB Objects | Notes |
|----------|-----------|-----------|-------------|------------|-------|
| `/production/boms` | `/api/boms` | `/boms` | GET | `bom_headers`, `bom_versions` | List BOMs (latest version) |
| `/production/boms` | `/api/boms` | `/boms` | POST | `bom_headers`, `bom_versions`, `bom_lines` | Save new BOM version |
| `/production/boms` | `/api/boms/[id]` | `/boms/:id` | GET | `bom_headers`, `bom_versions`, `bom_lines` | BOM detail & version history |

### 3.8 Production Module - Reports & Backflush

| UI Route | Web Proxy | API Route | HTTP Method | DB Objects | Notes |
|----------|-----------|-----------|-------------|------------|-------|
| - | `/api/proxy/production-reports` | `/production-reports` | POST | `production_reports`, `inventory_transactions` | Report production |
| - | `/api/proxy/material-precheck` | `/material-precheck` | POST | `inventory_balances` | Pre-check material availability |

### 3.9 Inventory Module

| UI Route | Web Proxy | API Route | HTTP Method | DB Objects | Notes |
|----------|-----------|-----------|-------------|------------|-------|
| `/inventory/balance` | `/api/proxy/inventory-balance` | `/inventory-balance` | GET | `inventory_balances` | Query balance |

### 3.10 Organization & HR

| UI Route | Web Proxy | API Route | HTTP Method | DB Objects | Notes |
|----------|-----------|-----------|-------------|------------|-------|
| `/production/org` | `/api/proxy/departments` | `/departments` | GET | `departments` | List departments |
| `/production/org` | `/api/proxy/users` | `/users` | GET | `sys_users` | List users |

---

## 4. Database Objects Reference

### 4.1 Core Tables

| Table | Schema | Description | Key Columns |
|-------|--------|-------------|-------------|
| `sys_tenants` | public | Multi-tenant root | `id`, `slug`, `name` |
| `companies` | public | Company (sub-tenant) | `id`, `tenant_id`, `code`, `name` |
| `sys_users` | public | User accounts | `id`, `email`, `password_hash` |
| `sys_user_companies` | public | User-Company mapping | `user_id`, `company_id`, `is_default` |

### 4.2 Master Data Tables

| Table | Schema | Description | Key Columns |
|-------|--------|-------------|-------------|
| `suppliers` | public | Vendor master | `id`, `company_id`, `code`, `name` |
| `uoms` | public | Unit of measure | `id`, `company_id`, `code`, `name` |
| `items` | public | Item master | `id`, `company_id`, `material_no`, `name`, `base_uom_id` |

### 4.3 Transaction Tables

| Table | Schema | Description | Key Columns |
|-------|--------|-------------|-------------|
| `purchase_orders` | public | PO header | `id`, `company_id`, `po_no`, `supplier_id` |
| `purchase_order_lines` | public | PO lines | `id`, `po_id`, `item_id`, `qty` |
| `work_orders` | public | MO header | `id`, `company_id`, `wo_no`, `item_id` |
| `production_reports` | public | Production report | `id`, `wo_id`, `reported_qty` |
| `inventory_transactions` | public | Inventory movement | `id`, `item_id`, `transaction_type`, `qty` |
| `inventory_balances` | public | Current stock | `id`, `item_id`, `warehouse_id`, `qty` |

---

## 5. Proxy Configuration

### 5.1 Next.js Proxy Setup

路徑：`apps/web/app/api/proxy/[...path]/route.ts`

```typescript
// Proxy 轉發規則
// /api/proxy/* → http://localhost:3001/*

// Headers 處理：
// - Authorization: 從 httpOnly cookie 讀取 token 並轉發
// - x-company-id: 從 cookie 讀取並注入
// - Content-Type: 原樣轉發
```

### 5.2 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_BASE_URL` | `http://localhost:3001` | Express API base URL |
| `API_PORT` | `3001` | API server port |
| `NEXT_PUBLIC_API_URL` | `/api/proxy` | Client-side API prefix |

---

## 6. Smoke Test Coverage

### 6.1 Endpoints Covered by `demo_smoke_master_data.sh`

| Endpoint | Method | Expected | Validation |
|----------|--------|----------|------------|
| `/health` | GET | 200 | Status code only |
| `/login` | POST | 200 | Status + token extraction |
| `/suppliers` | GET | 200 | Status + count > 0 |
| `/uoms` | GET | 200 | Status + count > 0 |
| `/items` | GET | 200 | Status + count > 0 |

### 6.2 Endpoints Covered by Newman (gate_app02.sh)

| Collection | Endpoints | Tests |
|------------|-----------|-------|
| Auth | `/health`, `/login`, `/switch-company` | 6 tests |
| Purchase | `/purchase-orders`, `/grn` | 4 tests |
| Production | `/work-orders`, `/production-reports` | 4 tests |

---

## 7. Debugging Guide

### 7.1 追蹤請求路徑

```bash
# 1. 檢查 Web Proxy 日誌
tail -f apps/web/.next/server/logs/*

# 2. 檢查 API Server 日誌
tail -f artifacts/api-dev.log

# 3. 檢查 DB 查詢
docker exec sipaios-postgres psql -U sipaios -d sipaios \
  -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"
```

### 7.2 常見問題路徑

| 症狀 | 可能原因 | 檢查點 |
|------|----------|--------|
| 404 Not Found | 路由未註冊 | API routes, proxy config |
| 401 Unauthorized | Token 無效 | Cookie, Authorization header |
| 403 Forbidden | 權限不足 | RBAC rules, company scope |
| 500 Internal Error | 後端錯誤 | API logs, DB connection |
| Empty Response | 資料不存在 | Seed execution, company_id filter |

---

## 8. Related Documents

| 文件 | 路徑 | 說明 |
|------|------|------|
| Inventory Report | `doc/runbooks/021A_inventory_report.md` | Gate 執行盤點 |
| API Contract | `doc/runbooks/api_contract_work_orders.md` | Work Orders API 契約 |
| Frontend Arch | `doc/runbooks/APP_009_FRONTEND_ARCH.md` | 前端架構說明 |

---

## Changelog

| 版本 | 日期 | 變更 |
|------|------|------|
| 1.0 | 2026-02-01 | 初版，SVC-APP-021C 交付 |
