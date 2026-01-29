# AI_AGENT_CONTRACT（AI Agent 邊界與操作契約）

- 文件等級：強制規範（Policy）
- 目的：釐清「AI 開發助理」與「系統內自動化 Agent」的權限邊界，避免自動化失控
- 適用：
  - Dev Agent：用於改 repo、產出文件、生成任務單
  - Runtime Agent：系統內的自動補貨/排程/建議器（若未來導入）

---

## 0. 基本立場（紅線）
- AI 不是超級使用者：任何高風險動作必須有人類批准
- 任何非人類操作者必須有獨立身分（Service Account）與可撤銷機制
- 系統必須提供「Kill Switch」讓管理員能一鍵停用自動化

---

## 1. Dev Agent（開發助理）契約
- 允許
  - 依白名單修改 repo 檔案
  - 產出文件/測試/任務拆解
- 禁止
  - 直接操作生產環境
  - 自行產生或變更密鑰、憑證、授權碼（除非有明確流程與審計）
- 回覆格式（硬規則）
  - 只回：狀態（DONE/ERROR/NEED_AUTH）+ 變更檔案清單 + 可操作測試步驟 +（若錯誤）原始錯誤訊息
- 搜尋範圍限制（避免浪費與誤改）
  - 必須排除 build 產物與依賴目錄

---

## 2. Runtime Agent（系統自動化）設計約束
- 身分與權限
  - 必須使用 Service Account（不可共用人類帳號）
  - 命名規範：`sa-agent-[function]-[env]`
  - 最小權限（Least Privilege）：只拿到完成任務所需的最小 Scope
- 操作閾值（Threshold）
  - 每種自動操作必須定義：
    - 單次上限（例如最大新增量、最大金額、最大筆數）
    - 期間上限（例如每小時/每日上限）
- 頻率限制 (Rate Limiting)
  - 針對 Agent 的 API Key/裝置身分必須有獨立限流策略 (預設: 100 req/min)
- 緊急熔斷（Kill Switch）
  - 管理員可一鍵停用：
    - 單一 Agent
    - 某類操作（例如「自動下單」）
- 審計與可追溯
  - Agent 的每次決策都必須寫入審計（含輸入摘要與輸出結果摘要）
- 失敗安全（Fail Safe）
  - 一旦偵測異常（連續失敗、異常頻率、超出閾值），自動停用並告警

---

## 3. 驗收標準（DoD）
- Dev Agent 與 Runtime Agent 的權限邊界清楚且可稽核
- Runtime Agent 具備 Threshold + Rate Limit + Kill Switch 並經過測試驗證

---

## 4. 標準 Agent 目錄與限制（Implementation Specs）
> 此章節定義系統中預設規劃的 Agent 及其權限邊界，開發時須嚴格遵守。

### 4.1 自動補貨 Agent (Restock Agent)
- **Service Account**: `sa-agent-restock`
- **任務描述**: 監控原物料庫存，當低於安全水位時自動生成「採購申請單（PR）」。
- **權限範圍 (Scope)**:
  - `READ`: Inventory, Product, Vendor
  - `WRITE`: PurchaseRequest (INSERT only)
  - **FORBIDDEN**: PurchaseOrder (APPROVE), Payment
- **硬閾值 (Hard Limits)**:
  - 單筆金額上限：$5,000 USD (超過需轉人工)
  - 每日申請單數：10 張
  - 頻率：每 1 小時執行一次
- **防呆機制**: 若 Vendor 狀態為 `INACTIVE`，禁止生成申請單。

### 4.2 排程優化 Agent (Scheduler Agent)
- **Service Account**: `sa-agent-scheduler`
- **任務描述**: 根據訂單交期與產線產能，建議最佳化排程順序。
- **權限範圍 (Scope)**:
  - `READ`: Order, ProductionLine, Capacity
  - `WRITE`: ScheduleSuggestion (INSERT/UPDATE)
  - **FORBIDDEN**: ProductionOrder (LOCK/DELETE) — **不可**更動已鎖定或進行中的工單
- **硬閾值 (Hard Limits)**:
  - 影響範圍：僅能調整未來 T+24h 之後的排程
  - 變動幅度：每日建議調整不超過 20% 的工單順序
- **互動模式**: 輸出為「建議 (Suggestion)」，需由生管人員在 UI 點擊「套用」才生效。

### 4.3 異常偵測 Agent (QC Sentinel)
- **Service Account**: `sa-agent-qc-sentinel`
- **任務描述**: 監控 IoT 採集數據，偵測連續不良或趨勢偏移。
- **權限範圍 (Scope)**:
  - `READ`: IoTTimeSeries, QualityLog
  - `WRITE`: Alert, SystemLog
  - **FORBIDDEN**: 任何產線控制指令 (不可直接停機，僅能發出 Critical Alert)
- **觸發條件**: 連續 5 筆數據超出 +/- 3 Sigma。