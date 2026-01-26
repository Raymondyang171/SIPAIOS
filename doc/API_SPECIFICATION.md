# API_SPECIFICATION（API 規範骨架：跨模組通用約束）

- 文件等級：執行標準（Skeleton）
- 目的：先把「安全與一致性」規範定死，避免 Phase 2 開始後 API 漫天生長
- 範圍：通用規範，不在此文件定義所有業務端點細節

---

## 0. 必守約束（紅線）
- 寫入型 API 必須：
  - Idempotency-Key（避免重送造成重複入庫/重複報工）
  - 可審計（sys_audit_logs）
- 任何自動化（Agent）呼叫必須：
  - 具備 Threshold + Rate Limit + Kill Switch（見 AI_AGENT_CONTRACT）
- 任何敏感資料不得出現在 log 與診斷包（見 SECURITY_MODEL / DIAGNOSTICS_BUNDLE）

---

## 1. 身分與授權（AuthN/AuthZ）
- 身分來源
  - 人類使用者（Web/PDA）：JWT / Session
  - 服務帳戶（Service Account）：API Key (Scoped)
  - 外部整合（Integration）：Webhook Secret / OAuth2 Client
- 授權模型
  - RBAC：角色 → 功能點權限
  - Data Scope：Self/Dept/All 等（App 層主控）
- 裝置信任
  - Web：Device Token + Admin Approval
  - PDA：一次性配對 → 長效 Key

---

## 2. 速率限制與資源保護（Rate Limit & Quota）
- 雙層限流
  - Gateway（IP 級）：擋掃描與暴力
  - App（帳號/裝置級）：擋自我 DDoS 與腳本濫用
- 高風險端點需更嚴格
  - 登入/配對/核准/匯出/更新檢查
- 配額（Quota）
  - 報表匯出、批次匯入、圖片上傳：需要單日或單小時配額

---

## 3. 錯誤語意與可觀測性（Error Semantics）
- 錯誤分類
  - 驗證失敗（400/422）
  - 權限不足（401/403）
  - 資源衝突（409 - 例如 Idempotency-Key payload 不一致）
  - 系統錯誤（500 - 需帶追蹤 ID）
- 每個錯誤必須回傳可追蹤識別（trace_id / request_id）
- 客戶端需顯示「可行的下一步」（不要只顯示未知錯誤）

---

## 4. Idempotency（必守）
- 適用範圍
  - 任何會改變狀態、影響庫存/工單/財務的 API (POST/PUT/PATCH)
- 行為
  - 同一 key + 同一 payload：重送應返回一致結果 (200 OK)
  - 同一 key + 不同 payload：必須拒絕並提示衝突 (409 Conflict)
- 保存期限
  - Idempotency 記錄需有保留期（見 DATA_RETENTION_POLICY）

---

## 5. 審計（Audit）
- 必須審計的事件
  - 權限變更、設備核准/撤銷、登入、資料匯出、更新/回滾、Agent 自動操作
- 審計不得含敏感欄位明文

---

## 6. 最小端點清單（Phase 0 必備）
- 身分與裝置：登入/登出、裝置註冊/核准/撤銷、PDA 配對
- 系統運維：Health Check、Version Check、Diagnostics Bundle
- 權限與設定：My Permissions、Update SysConfig

---

## 7. 外部整合與 Webhook 標準 (Integration Specs)
### 7.1 Inbound Integration (外部呼叫我)
- **情境**: ERP 同步料號、客戶資料到本系統。
- **認證**:
  - 必須使用 `X-API-Key` 標頭。
  - 必須設定 IP Allowlist (僅限客戶內網 ERP 伺服器 IP)。
- **批次處理**:
  - 建議使用 Bulk API (`POST /api/v1/products/bulk`)。
  - 單次批次上限：1000 筆 (避免 Lock 造成阻塞)。

### 7.2 Outbound Webhook (我通知外部)
- **情境**: 工單完成、庫存異動通知 ERP。
- **安全性 (HMAC)**:
  - 每個 Webhook Event 必須包含 `X-Signature` header。
  - 簽章演算法：`HMAC-SHA256(payload, secret)`。
- **重試機制 (Retry Policy)**:
  - 接收端需回傳 `2xx` 視為成功。
  - 失敗策略：指數退避 (Exponential Backoff)。
    - 第 1 次重試：10s
    - 第 2 次重試：60s... 最大重試 5 次，之後標記為 `DEAD_LETTER`。

---

## 附錄 A：資料契約標準 (Data Contract & SoR)
> 此章節定義 MES 與 ERP 互動時的「通用語言」，開發時嚴禁發明新詞彙。

### A.1 欄位命名與格式規範 (Field Standards)
- **料號 (Material ID)**: 
  - 統一命名: `material_no` (String)
  - 格式: 僅限大寫英數 + `-`，最大長度 30。
- **工單 (Work Order)**: 
  - 統一命名: `wo_no` (String)
  - 格式: ERP 單號為準。
- **數量 (Quantity)**: 
  - 統一命名: `qty` (Decimal/Numeric)
  - 精度: 統一保留小數點後 4 位 (`10.0000`)。
- **時間戳 (Timestamp)**: 
  - 統一命名: `*_at` (例 `created_at`, `synced_at`)
  - 格式: ISO 8601 UTC (`2023-10-27T10:00:00Z`)。

### A.2 記錄系統歸屬 (System of Record - SoR)
- **ERP 擁有主權 (ERP is Master)**:
  - 料號基本資料 (Part Number, Description, Unit)
  - 客戶與供應商資料 (Customer, Vendor)
  - 原始工單 (Production Order Header)
  - *MES 對上述資料僅能 Read/Sync，嚴禁修改。*
- **MES 擁有主權 (MES is Master)**:
  - 報工紀錄 (Labor Ticket)
  - 機台參數 (Machine Parameter)
  - 現場檢驗數據 (QC Data)
  - *MES 產生後單向拋轉給 ERP。*