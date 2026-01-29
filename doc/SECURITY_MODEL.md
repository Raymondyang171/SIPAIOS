# SECURITY_MODEL（安全架構與零信任模型）

- 文件等級：核心架構
- 目的：定義 Authentication, Authorization 與資料安全標準
- 核心：Never Trust, Always Verify

---

## 1. 零信任基礎 (Zero Trust Basics)
- **邊界防禦無效論**:
  - 假設內網已經被滲透，或者攻擊者就是內部員工。
  - 僅靠 VPN 或 IP 白名單不足以構成安全。
- **身分是唯一邊界**:
  - 每個請求（Request）都必須附帶可驗證的身分（Token/Sig）。

---

## 2. 身分驗證 (Authentication)
### 2.1 人類使用者 (Human)
- **Web**: JWT (Short-lived) + Refresh Token (HttpOnly Cookie)。
- **PDA**: Device Key (Long-lived) + Pin Code (Session)。

### 2.2 機器與服務 (Machine)
- **Service Accounts**: 用於 Agent 或內部微服務，使用 Scoped API Key。
- **Integrations**: HMAC 簽章 (Webhook) 或 OAuth2 Client Credentials。

---

## 3. 授權模型 (Authorization)
- **RBAC (Role-Based Access Control)**:
  - 定義角色：`Admin`, `Operator`, `Planner`, `Viewer`。
  - 權限綁定：`role_id` -> `permission` (e.g., `work_order.create`)。
- **Data Scope (資料範圍)**:
  - 即使有 `work_order.read` 權限，也需判斷範圍：
  - `OWN`: 只能看自己建立的。
  - `DEPT`: 只能看同部門的。
  - `ALL`: 可看全公司的。

---

## 4. 非人類實體身分驗證 (Agent Security)
### 4.1 Agent 身分定義
- 命名規範：`sa-agent-[function]-[env]` (例: `sa-agent-restock-prod`)
- 憑證管理：使用短期 Token 或 Vault 注入，嚴禁硬編碼。

### 4.2 最小權限與限制
- **讀取權限**：預設僅限於任務相關的資料表。
- **寫入權限**：
  - `Restock Agent` 僅能 `INSERT` 採購單，**不可** `APPROVE`。
- **熔斷機制 (Kill Switch)**：
  - 若 Agent 異常（如 10 分鐘內 5 次 5xx 錯誤），自動凍結帳號。
  - 必須提供 API 讓管理員一鍵停用所有 Agent。

---

## 5. 資料分級與遮罩 (Data Classification & Masking)
> 這是 V2.1 新增重點：防止內鬼查看機敏成本與配方。

### 5.1 分級定義
- **L1 公開 (Public)**: 錯誤代碼、系統公告。
- **L2 內部 (Internal)**: 料號、工單號、庫存數量。(預設等級)
- **L3 機敏 (Sensitive)**: 
  - **財務類**: 單價 (Unit Price)、總成本 (Total Cost)、薪資工時。
  - **配方類**: 關鍵製程參數 (Recipe)、BOM 替代料比例。
  - **個資類**: 員工手機號、身分證號。

### 5.2 處理策略
- **API 層級遮罩**: 
  - 針對 L3 欄位，若使用者無 `READ_SENSITIVE` 特殊權限，API 回傳時必須：
    - 數值型：回傳 `0` 或 `-1`。
    - 字串型：回傳 `***MASKED***`。
    - *嚴禁在前端 UI 層才做隱藏（API response 不可洩漏 raw data）。*
- **審計要求**:
  - 任何對 L3 資料的 `READ` 操作（包含匯出），必須在 `sys_audit_logs` 留下記錄（Who, When, What）。

---

## 6. 驗收標準 (DoD)
- 所有 API 請求皆經過 AuthN 驗證。
- 只有具備 `READ_SENSITIVE` 權限的角色能看到 L3 欄位明文。
- Agent 操作有獨立的 Audit Log 標記 (`operator_type: MACHINE`)。