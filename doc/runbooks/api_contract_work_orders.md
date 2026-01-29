# Work Orders API Contract (Demo Lock) — v0

> 放置路徑（建議）：`doc/runbooks/api_contract_work_orders.md`  
> 目的：用**最小契約**把 Demo「不漂移」釘住，避免前後端欄位命名不一致造成 UI 空表/空值。

---

## 1. 範圍（本文件覆蓋）
- List：`GET /work-orders`
- Detail：`GET /work-orders/:id`
- Create（供 gate/newman 使用）：`POST /work-orders`（僅列出最小必要欄位）

> 非本範圍：RLS/權限、BOM 版本校驗、排程演算法、成本/庫存計算（全部留到後續 SVC）。

---

## 2. UI「可讀欄位」最小集合（Canonical）
> UI 只依賴以下欄位；其餘都可放在 Raw JSON 區塊。

- `id`：UUID（必填）
- `wo_no`：工單號（必填；可由後端欄位映射取得）
- `status`：狀態（必填；未知顯示原字串）
- `item_no`：料號/品號（可空；可由後端欄位映射取得）
- `planned_qty`：計畫數量（可空；可由後端欄位映射取得）
- `site`：站點（可空；id 或 name 皆可）
- `warehouse`：倉別（可空；code 或 name 皆可）
- `scheduled_start`：預計開工時間（可空；UI 顯示「—」）
- `created_at`：建立時間（可空；UI 顯示「—」）
- `created_by`：建立者（可空；UI 顯示「—」）

---

## 3. 後端欄位漂移的「容錯映射」（Fallback Rules）
> 若 API 回傳欄位改名，UI 依序取值（先有先贏）。

### 3.1 工單號 `wo_no`
優先序：
1) `work_order_no`
2) `wo_no`
3) `order_no`
4) `no`

### 3.2 料號 `item_no`
優先序：
1) `item_no`
2) `material_no`
3) `product_no`

### 3.3 計畫數量 `planned_qty`
優先序：
1) `planned_qty`
2) `qty`
3) `plan_qty`

### 3.4 站點 `site`
優先序：
1) `site_name`
2) `site_code`
3) `site_id`

### 3.5 倉別 `warehouse`
優先序：
1) `warehouse_code`
2) `warehouse_name`
3) `warehouse_id`

### 3.6 排程時間 `scheduled_start`
優先序：
1) `scheduled_start`
2) `scheduled_at`
3) `start_time`

---

## 4. Null/空值顯示規則（Demo 一致性）
- 任何可空欄位：UI 一律顯示 `—`（不可顯示 `null` 或空白）
- `planned_qty`：若為 0 或缺值，UI 顯示 `—`（避免被誤讀為「真的 0」）
- `scheduled_start`：缺值不阻擋 Demo 流程；僅影響「看起來完整度」

---

## 5. List 行為（Demo 版）
- 排序：以 `created_at` 由新到舊（若後端不支援，前端可 client-side sort）
- 分頁：Demo 可先不做；但 UI 不可因「缺分頁」而空表（顯示目前拿到的全部）

---

## 6. Detail 行為（Demo 版）
- 必須顯示：
  - 「可讀卡片」：上述 Canonical 欄位
  - 「Raw JSON」：可收合（Collapsed by default）
- 若 Canonical 欄位缺失：仍要顯示 Raw JSON，並讓使用者能看到後端真實 payload（避免 Demo 當場斷線）

---

## 7. Create（POST /work-orders）最小必要欄位（供 gate）
> 以 Gate/Newman 目前能建立資料為準；此處只定義「不該消失」的最小集合。

- 必填（建議維持不變）：
  - `company_id`
  - `site_id`
  - `warehouse_id`
  - `bom_version_id`
  - `planned_qty`
- 建議：
  - 後端回應必含 `id`，且 List/Detail 可查得到

---

## 8. 驗收錨點（可觀測結果）
- `bash scripts/gate_app02.sh` 建立的工單：
  - Web List 立即可見（至少 1 筆 WO-*）
  - 點進 Detail：可讀卡片 + Raw JSON 可收合
- 無痕模式：
  - 直打 `/production/work-orders` → 轉 `/production/login`
  - 登入後出現 Shell；Logout 立即回 login，且無 Next.js cookies runtime error

---

## 9. 變更規則（防漂移）
- 任一端（API 或 UI）要改動欄位命名/結構：
  - 先更新本文件（或新增 v1）
  - 再更新 UI fallback（或移除已不需要的 fallback）
