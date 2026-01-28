# ROADMAP v0.2.2 — 雙軌並行路徑圖 (Dual-Track Strategy)

* **版本**：v0.2.2 (Post-INFRA-01 Fix)
* **日期**：2026-01-28
* **依據**：`PROJECT_LOG_rewrited.md` (Up to Entry [12])
* **狀態總結**：
  * **底層 (Infra)**：🟢 **READY**。Stage 2A 還原腳本已修復，`make reset` < 5s 可用。
  * **業務 (App)**：🟢 **READY**。後端骨架 (APP-01) 已完成，可以開始堆疊業務邏輯 (APP-02)。



---

## 軌道 A：SIP AIOS 底層架構 (Infrastructure Track)

> **負責人**：Architect / DevOps
> **目標**：提供「可隨時自殺重來」的穩定環境，確保業務邏輯開發時不會被髒數據卡死。

### ✅ 1. 已完成 (Completed Achievements)

| 里程碑 | 具體產出與證明 | 意義 |
| --- | --- | --- |
| **Stage 1: Repo Setup** | `ARCHITECTURE.md`, `00_INDEX.md` | 確立開發規範與文件導航。 |
| **Stage 2C: Tenant Isolation** | `sys_tenants` 表 + Composite FK 強制約束 | **物理級別防止資料外洩**。DB 拒絕寫入跨租戶資料。 |
| **Stage 2C: Hybrid Model** | `sys_tenants.slug` 對齊 `companies.code` | 解決 SaaS 與 On-Prem 架構不相容問題。 |
| **Schema Verification** | `schema-probed` 驗證機制 | 自動檢查 DB Schema 是否符合 V2.1 規範。 |

### ✅ 2. 已解決卡點 (Resolved Blocker) — ~~P0~~ **DONE**

* **✅ 任務：Fix Restore Baseline (Stage 2A Remediation)** — **已完成 (Entry [12])**
* **解法**：`08_restore_latest_phase1_baseline.sh` 採用 `DROP SCHEMA public CASCADE` + `CREATE SCHEMA public` 策略。
* **結果**：`make reset` 執行時間 **~4.2 秒**（目標 < 30s），verify PASS。
* **來源**：Project Log Entry [12] (resolved Entry [9]).



### 🚀 3. 下一步目標 (Upcoming Objectives)

| 順序 | 任務代號 | 任務名稱 (What) | 驗收標準 (Acceptance Criteria) |
| --- | --- | --- | --- |
| ~~1~~ | ~~INFRA-01~~ | ~~修復一鍵重置~~ | ✅ **DONE** — `make reset` < 5s, verify PASS |
| **1** | **INFRA-02** | **可觀測性基礎 (Observability)** | 部署 Loki + Prometheus。能看到 API Access Log 與 DB Slow Query Log。 |
| **2** | **INFRA-03** | **離線遷移工具 (Offline Copy)** | 撰寫 Script，能將指定 Tenant ID 的資料匯出成 SQL 包，並能在另一台機器匯入。 |

---

## 軌道 B：ERP 業務應用 (Business Logic Track)

> **負責人**：Full-Stack Developer
> **目標**：實現《系統計劃書 V1.1》定義的商業價值。

### ✅ 1. 已完成 (Completed Achievements)

| 里程碑 | 具體產出與證明 | 意義 |
| --- | --- | --- |
| **Business Schema V1.1** | V1.1 SQLs (`purchase_orders`, `stock`, etc.) | 業務規則（Backflush, FIFO）已固化在 DB 結構中。 |
| **APP-01: Skeleton & Auth** | **Express API Server** + Postman Tests | [Entry 11] `/health` 通過, `/login` 可換 JWT, `/switch-company` 可切換租戶。 |

### 🛑 2. 當前狀態 (Current Status) — **骨架已立，準備填肉**

* 後端 API 已經可以跑起來 (Port 3001)，並且能處理身分驗證。
* **缺口**：還沒有任何實際的業務 API (PO, GRN, MO)。

### 🚀 3. 下一步目標 (Upcoming Objectives)

| 順序 | 任務代號 | 任務名稱 (What) | 驗收標準 (Acceptance Criteria) |
| --- | --- | --- | --- |
| **1** | **APP-02** | **採購閉環 (Purchase Loop)** | **API Only (先)**：<br>

<br>1. `POST /purchase-orders` (建立 PO)<br>

<br>2. `POST /goods-receipt-notes` (收貨 GRN)<br>

<br>3. 驗證 `inventory_balance` 庫存增加。<br>

<br>4. 需提供 Postman Collection 證明跑通。 |
| **2** | **APP-03** | **生產閉環 (Production Loop)** | **API Only**：<br>

<br>1. `POST /manufacturing-orders` (開工單)<br>

<br>2. `POST /production-report` (報工+Backflush)<br>

<br>3. 驗證 Raw Material 扣除, FG 增加。<br>

<br>4. 驗證 Lot Tracking (批號追溯)。 |
| **3** | **APP-04** | **前端 UI (Purchase UI)** | 將 APP-02 的 API 接上 React 前端畫面 (列表 + 表單)。 |

---

## 4. 關鍵依賴與風險 (Critical Dependencies)

1. **APP-02 依賴 INFRA-01**：
* 雖然 `APP-02` (採購) 可以現在開始寫，但**強烈建議**先修好 `INFRA-01` (Restore)。
* *風險*：如果在沒有 Restore 的情況下開發 APP-02，測試產生的髒數據無法清除，會導致 Postman 自動化測試不穩定。


2. **APP-01 的技術債**：
* 目前使用 `npm` (在 `apps/api` 下) 而非 root 的 `pnpm`。需確保 CI/CD 流程能兼容。
* Auth 目前只有 Access Token，無 Refresh Token (Phase 2 暫不處理，接受短期過期)。



---

## 5. 給 Agent 的執行指令 (Actionable Plan)

請依照以下順序指派 SVC (Service Tasks)：

1. ~~**[🔴 P0 急件] SVC-INFRA-01**~~ ✅ **DONE (Entry [12])**
   * `make reset` < 5s, verify PASS. Track A 已解鎖。

2. **[🟡 P1 業務] SVC-APP-02**:
* **指令**： "Based on `APP-01` skeleton, implement the Purchase Order -> GRN flow (Schema V1.1). Create strict DTOs and Service logic. Verify with Postman."
* **目的**：產出第一個業務閉環證據。


3. **[⚪ P2 待命] SVC-APP-03**:
* **指令**： "Implement Manufacturing Order and Backflush logic."
* **目的**：產出生產核心閉環。