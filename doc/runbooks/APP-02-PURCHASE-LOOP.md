# APP-02 Purchase Loop Runbook

## Overview

APP-02 實作採購閉環：PO (Purchase Order) -> GRN (Goods Receipt Note) -> Inventory Balance 更新。

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/purchase-orders` | 建立採購單 |
| POST | `/goods-receipt-notes` | 建立收貨單 (自動更新庫存) |
| GET | `/inventory-balances` | 查詢庫存餘額 |

## Prerequisites

1. **Database**: PostgreSQL 須運行中且已套用 schema
2. **Seed Data**: 執行 seed scripts

```bash
# 從 apps/api 目錄執行
docker exec -i sipaios-postgres psql -U sipaios -d sipaios < seeds/001_auth_test_users.sql
docker exec -i sipaios-postgres psql -U sipaios -d sipaios < seeds/002_purchase_test_data.sql
```

3. **API Server**: 啟動 API

```bash
cd apps/api
npm start
```

## Replay / Reset

完整重播步驟：

```bash
# 1. 重置資料庫 (從專案根目錄)
make reset

# 2. 套用 APP-02 seed
docker exec -i sipaios-postgres psql -U sipaios -d sipaios < apps/api/seeds/002_purchase_test_data.sql

# 3. 重啟 API
cd apps/api && npm start
```

## Newman Test

執行 Newman 回歸測試：

```bash
cd apps/api

# 安裝 newman (如未安裝)
npm install -g newman

# 執行測試
newman run postman/SIP-AIOS-Auth.postman_collection.json \
  -e postman/SIP-AIOS-Local.postman_environment.json \
  --reporters cli,json \
  --reporter-json-export newman-results.json
```

## Expected Results

| Metric | Expectation |
|--------|-------------|
| Total Requests | 14 (9 APP-01 + 5 APP-02) |
| Total Assertions | ~30+ |
| Failures | 0 |

## Validation Checklist

- [ ] `POST /purchase-orders` 回傳 201 + PO id + status=draft
- [ ] `POST /goods-receipt-notes` 回傳 201 + GRN id + status=received
- [ ] `GET /inventory-balances` 查到指定 item 的 qty_on_hand >= 50
- [ ] 無 Token 呼叫 → 401 AUTH_REQUIRED
- [ ] 跨公司 Supplier → 403 FORBIDDEN

## Test Data (Fixed UUIDs)

| Entity | ID | Code |
|--------|-----|------|
| UOM | 00000000-0000-0000-0000-000000000001 | PCS |
| Site (DEMO) | 00000000-0000-0000-0000-000000000201 | MAIN |
| Site (Other) | 00000000-0000-0000-0000-000000000202 | MAIN |
| Warehouse | 00000000-0000-0000-0000-000000000301 | WH-01 |
| Supplier (DEMO) | 00000000-0000-0000-0000-000000000101 | SUP-001 |
| Supplier (Other) | 00000000-0000-0000-0000-000000000102 | SUP-002 |
| Item | 00000000-0000-0000-0000-000000000401 | ITEM-001 |

## Troubleshooting

### DB Connection Failed
```
確認 PostgreSQL container 運行中:
docker ps | grep sipaios-postgres
```

### 401 AUTH_FAILED
```
確認 seed 已執行且密碼 hash 正確:
SELECT email, password_hash FROM sys_users WHERE email = 'admin@demo.local';
```

### 403 FORBIDDEN on PO/GRN
```
確認 supplier/site/item 屬於正確的 company_id:
SELECT id, company_id, code FROM suppliers;
```
