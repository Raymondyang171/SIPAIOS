# SVC-APP-020A: BOM Editor（版本化）Runbook

> **Date**: 2026-01-31  
> **Scope**: BOM 管理與版本化、MO 引用 BOM 驗證

---

## 1. UI 操作：建立 BOM 新版本

1. 登入 Web UI
2. 進入：`/production/boms`
3. 在「New Version」區塊：
   - 選擇 Parent Item（成品/半成品）
   - 加入 1+ 條 Lines（Child Item + Qty）
4. 點擊 **Save New Version**
5. 右側「Version History」出現新的版本號與時間

> 注意：每次 Save 都會新增一個版本，不覆蓋舊版本。

---

## 2. API 驗證：BOM → MO 版本一致

### 2.1 建立 BOM v1
```bash
curl -X POST "$API_BASE/boms" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: bom-verify-001" \
  -d '{
    "parent_item_id": "<FG_ITEM_ID>",
    "lines": [
      { "child_item_id": "<RM_ITEM_ID>", "qty": "1" }
    ]
  }'
```
期望：回傳 `bom_version_id` 與 `version_no=1`。

### 2.2 建立 MO（使用 BOM v1）
```bash
curl -X POST "$API_BASE/work-orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "site_id": "<SITE_ID>",
    "item_id": "<FG_ITEM_ID>",
    "planned_qty": 1,
    "uom_id": "<FG_UOM_ID>",
    "bom_version_id": "<BOM_VERSION_ID>",
    "primary_warehouse_id": "<WAREHOUSE_ID>"
  }'
```
期望：回傳 `bom_version_id == <BOM_VERSION_ID>`。

---

## 3. Smoke 驗收（可重跑）

```bash
./scripts/smoke/demo_smoke_bom.sh
```

期望：輸出 `SVC-APP-020A BOM smoke test PASS`。

---

## 4. Troubleshooting

### 4.1 Items 下拉空
可能原因：未執行 seed、items 無資料  
處理：
```bash
make reset
```

### 4.2 403 / 跨公司存取
可能原因：使用者未切換 company 或 token 不含 company_id  
處理：重新登入或使用 `/switch-company` 切換。

### 4.3 Idempotency-Key 缺失
錯誤：`IDEMPOTENCY_REQUIRED`  
處理：在 POST /boms 時加上 `Idempotency-Key` header。

### 4.4 BOM 版本建立失敗
可能原因：child item 沒有 base_uom_id  
處理：確認 Items 的 base_uom_id 已設置。
