# APP-02 Purchase Loop Runbook

## Overview

APP-02 實作採購閉環：PO (Purchase Order) -> GRN (Goods Receipt Note) -> Inventory Balance 更新。

## One-Click Gate (Recommended)

從專案根目錄執行：

```bash
make gate-app-02
```

這個命令會自動完成：
1. DB 重播 (Phase1 → Stage2B RBAC → Stage2C Company Scope)
2. Seed 測試資料 (auth + purchase)
3. Newman 回歸測試

**Gate 行為**：所有步驟成功 → exit 0；任一失敗 → exit ≠ 0

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/purchase-orders` | 建立採購單 |
| POST | `/goods-receipt-notes` | 建立收貨單 (自動更新庫存) |
| GET | `/inventory-balances` | 查詢庫存餘額 |

## Prerequisites

1. **Docker**: PostgreSQL container 須運行中
2. **Node.js**: >= 18.0.0
3. **Dependencies**: 安裝專案依賴（newman 已納入 devDependencies）
   ```bash
   npm ci --prefix apps/api
   ```
4. **API Server**: 須在 `http://localhost:3000` 運行
   ```bash
   cd apps/api && npm start
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

### Gate 失敗時
```
查看詳細 log:
ls -la artifacts/gate/app02/
cat artifacts/gate/app02/<timestamp>/04_summary.txt
```
