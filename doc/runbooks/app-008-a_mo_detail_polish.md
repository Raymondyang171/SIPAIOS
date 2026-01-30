# SVC-APP-008-A: MO Detail Polish Runbook

## Overview

此 runbook 描述如何驗收 MO Detail 頁面的 UI 優化（移除 Raw JSON、新增 Header + Tabs）。

## Prerequisites

- PostgreSQL 容器已啟動 (`sipaios-postgres`)
- 已執行 DB schema 和 seed 資料

## 啟動步驟

### 1. 啟動 API 服務

```bash
cd apps/api
npm run dev
```

預期輸出：`Server running on http://localhost:3001`

### 2. 啟動 Web 服務

```bash
cd apps/web
npm run dev
```

預期輸出：`Local: http://localhost:3002`

### 3. 執行 Gate 測試（含 DB 重建 + Seed）

```bash
./scripts/gate_app02.sh
```

預期輸出：`[GATE PASS]`

## 驗收 Checklist

### A. 開啟 MO Detail 頁面

1. 開啟瀏覽器，前往 `http://localhost:3002/production/work-orders`
2. 點選任一 Work Order（例如 `WO-BACKFLUSH-001`）進入 Detail 頁面

### B. Header 驗收

| 項目 | 預期 | Pass/Fail |
|------|------|-----------|
| WO No 顯示 | 顯示如 `WO-BACKFLUSH-001` | ☐ |
| Status Badge | 顯示 `draft` / `released` / `completed` 對應顏色 | ☐ |
| Info Grid | 顯示 Item、Planned Qty、Site、Warehouse | ☐ |
| 空值顯示 | 空值欄位顯示「—」 | ☐ |

### C. Tabs 驗收

| 項目 | 預期 | Pass/Fail |
|------|------|-----------|
| Tab 數量 | 3 個：Progress / BOM / Materials / Logs | ☐ |
| Tab 切換 | 點擊 Tab 可正常切換，不會 layout 崩壞 | ☐ |
| Progress Tab | 顯示 Timeline（Created → Released → Completed） | ☐ |
| BOM Tab | 顯示 Material Precheck 表格（Item、Qty/Unit、Needed、Available、Status） | ☐ |
| BOM Tab - Can Produce | 若庫存足夠，顯示綠色「Can Produce」badge | ☐ |
| BOM Tab - Insufficient | 若庫存不足，顯示紅色「Insufficient Stock」badge | ☐ |
| Logs Tab | 顯示「尚無資料」placeholder | ☐ |

### D. Raw JSON 移除驗收

| 項目 | 預期 | Pass/Fail |
|------|------|-----------|
| 無 Raw JSON | 頁面不再顯示 `<details>` 或 JSON dump | ☐ |

### E. 空狀態一致性

| 項目 | 預期 | Pass/Fail |
|------|------|-----------|
| 空值顯示 | 所有空值統一顯示「—」 | ☐ |
| 空 BOM | 若 BOM 無資料，顯示「尚無資料 — No BOM materials defined」 | ☐ |
| 空 Logs | Logs Tab 顯示「尚無資料 — No activity logs available」 | ☐ |

## 故障排除

### API 無法連線

```bash
# 檢查 API 服務
curl http://localhost:3001/health

# 重啟 API
pkill -f "node.*api" && cd apps/api && npm run dev
```

### Web 頁面空白

```bash
# 檢查 Web 服務
curl http://localhost:3002

# 重啟 Web
pkill -f "next" && cd apps/web && npm run dev
```

## 相關檔案

- 主頁面：`apps/web/app/production/(shell)/work-orders/[id]/page.tsx`
- API Precheck Endpoint：`apps/api/src/routes/work-orders.js`（`GET /work-orders/:id/material-precheck`）
