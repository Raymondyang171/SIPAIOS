# LLM 變更護欄 + Prompt 模板（On-Prem v2.1｜每客戶一套）

> 目標：讓 Codex / Gemini 在產出變更時「先對齊架構，再下刀」  
> 原則：任何變更必須先標註影響面（Gateway/App/Worker/DB/Redis/Storage）

---

## 1. 變更分類（先分層、再動手）

### 1.1 只屬於 UI/前端（低風險）
- 調整頁面排版、表格、欄位、互動
- 允許：新增/調整 component、樣式、文案、空狀態
- 禁止：改 DB schema、改權限規則、改 API 回傳格式（除非另開 PR）

### 1.2 App Core（中風險）
- 新增 API、調整 RBAC/Scope、設備信任流程
- 必須交付：
  - API 契約（request/response）
  - 權限規則（誰可呼叫）
  - 失敗碼與錯誤訊息（403/409/422/500）

### 1.3 Worker（中風險）
- 新增任務、報表、匯入匯出、重送機制
- 必須交付：
  - job 定義（狀態機、timeout、重試策略）
  - 任務輸入/輸出（DB/Storage 寫入點）
  - idempotency（重跑不會造成重複扣庫/重複發送）

### 1.4 DB（高風險）
- schema/migration、constraint、索引、交易一致性、審計
- 必須交付：
  - migration（up/down 或至少可回退策略）
  - 資料回填（backfill）策略（若新增 NOT NULL）
  - 影響評估（鎖表風險、索引建立時間）

### 1.5 Gateway / Nginx（高風險）
- TLS、反代路由、IP allowlist、rate limit
- 必須交付：
  - 變更前後路由圖
  - 回退方案（rollback）
  - 驗收步驟（curl / health check）

---

## 2. 權限需求（最容易引爆）— 強制採用「單一裁決點」

### 2.1 規則
- App Core 是「最終裁決點」
  - 所有敏感讀取/寫入都必須在 App Core 做 RBAC/Scope 判斷
- UI 只做顯示 gate
  - 不可把 UI 當安全邊界
- DB 用 constraint 保底
  - 防止無效狀態（例如 status enum/check）

### 2.2 UI 三件套（強制）
- 403：顯示「權限不足」
- 0 rows：顯示「空狀態」
- nullable：fallback（例如 "-"）

---

## 3. 每次改動的交付格式（LLM 必須輸出）

- 變更類型：UI / App Core / Worker / DB / Gateway
- 受影響檔案清單（路徑）
- 風險點（至少 3 條）
- 回退策略（1 條）
- 驗收清單（最少 5 條）
  - 至少包含：無權限、正確權限、空資料、錯誤狀態、成功路徑

---

## 4. Prompt 模板（直接貼給 Codex/Gemini）

### 4.1 UI-only（不碰權限/DB）
請只修改 UI（components 與頁面佈局），禁止改動：
- RBAC/Scope 規則
- API 行為與回傳格式
- DB schema/migration
- Worker 任務流程

交付：
- 修改檔案清單
- 完整 diff（可貼上）
- 空狀態/403/null-safe 都要補齊

### 4.2 權限變更（App Core 最終裁決）
我要新增/調整「{資源}」權限規則：
- 先輸出權限矩陣：角色 × 動作 × 範圍（org/unit/project）
- 再輸出實作方案（App Core 作最終裁決）
- UI 只做顯示 gate（不得當安全邊界）
- DB 只加必要 constraint/索引（不做重邏輯）

交付：
- 受影響 API 清單
- 錯誤碼規範（403/409/422）
- 測試案例（至少：無權限/有權限/邊界條件）

### 4.3 DB migration（高風險）
我要調整 schema：
- 先列出 migration 設計（含回退策略）
- 評估鎖表/索引建立時間
- 必要時分兩階段（可空 → 回填 → 改 NOT NULL）
交付：
- migration SQL
- backfill SQL
- 驗收 SQL（select 檢查）

---
