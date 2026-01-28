沒問題。這是一個非常明智的決定。

既然開發已經進入深水區，將「地基（Infra）」與「裝潢（UI/Business）」混在一起看只會造成混亂。**拆開來看，進度與卡點會一目了然。**

以下是為您重新架構的 **`ROADMAP_v0_2.md`**。這份文件嚴格將 **「SIP AIOS 底層架構」** 與 **「ERP 業務應用」** 分離，並清楚標示「已完成 (Done)」與「待執行 (To-Do)」。

請確認以下內容，若無誤可直接存檔覆蓋舊 Roadmap。

---

# ROADMAP v0.2 — 雙軌並行路徑圖 (Dual-Track Strategy)

* **版本**：v0.2 (Split View)
* **日期**：2026-01-28
* **狀態總結**：
* **底層 (Infra)**：地基已打好 (DB Schema/Tenant)，但「自我修復機制 (Restore)」卡關。
* **業務 (App)**：藍圖已畫好 (Schema V1.1)，但「磚塊 (Code/UI)」還沒開始砌。



---

## 軌道 A：SIP AIOS 底層架構 (Infrastructure Track)

> **負責人**：Architect / DevOps
> **目標**：打造一個「打不掛、可回放、可搬遷」的執行環境。業務邏輯寫得再爛，底層都不能崩。

### ✅ 1. 已完成 (Completed Achievements)

| 里程碑 | 具體產出與證明 | 意義 |
| --- | --- | --- |
| **Stage 1: Repo Setup** | `00_INDEX.md`, `ARCHITECTURE.md` 等 V2.1 文件體系確立。 | 確立了開發規範與文件導航，讓 AI Agent 不會迷路。 |
| **Stage 2C: Tenant Isolation** | DB 層級強制實施 `Composite FK` (e.g., `shipments(id, company_id)`)。 | **物理級別防止資料外洩**。即使工程師寫錯 SQL，資料庫也會拒絕寫入錯誤租戶的資料。 |
| **Stage 2C: Hybrid Model** | 確立 `Company = Tenant` 策略，並在 `sys_tenants` 表落地。 | 解決了 SaaS 與 On-Prem 架構不相容的難題（一套代碼通吃）。 |
| **Schema Verification** | `schema-probed` 驗證腳本。 | 自動檢查 DB Schema 是否符合 V2.1 規範（有無缺欄位、型別錯誤）。 |

### 🚧 2. 當前卡點 (Current Blocker) — **必須優先解決**

* **🔴 任務：Fix Restore Baseline (Stage 2A Remediation)**
* **現況**：雖然 Schema 建立了，但 `make restore` 腳本因為 Foreign Key 依賴順序問題（Circular Dependency）會報錯。
* **影響**：現在環境髒了只能「手動修」或「重建 Container」，無法實現「30秒一鍵重置」。**這違反了 SIP AIOS「穩定壓倒一切」的原則。**
* **行動**：重寫 `restore.sh` 與 `seed.sql`，確保插入順序為 `sys_tenants` -> `companies` -> `users` -> 業務資料。



### 🚀 3. 下一步目標 (Upcoming Objectives)

| 順序 | 任務代號 | 任務名稱 (What) | 驗收標準 (Acceptance Criteria) |
| --- | --- | --- | --- |
| **1** | **INFRA-01** | **修復一鍵重置 (One-Click Reset)** | 執行 `make reset`，DB 必須在 30 秒內清空並完美重建 Seed 資料，無任何 Error Log。 |
| **2** | **INFRA-02** | **可觀測性基礎 (Observability)** | 部署 Loki + Prometheus (Docker Compose)。能看到 Nginx Access Log 與 DB Slow Query Log。 |
| **3** | **INFRA-03** | **離線遷移工具 (Offline Copy)** | 撰寫 Script，能將指定 Tenant ID 的資料匯出成 SQL 或 CSV 包，並能在另一台機器匯入。 |

---

## 軌道 B：ERP 業務應用 (Business Logic Track)

> **負責人**：Full-Stack Developer
> **目標**：實現《系統計劃書 V1.1》定義的商業價值。讓使用者能看到畫面、點擊按鈕。

### ✅ 1. 已完成 (Completed Achievements)

| 里程碑 | 具體產出與證明 | 意義 |
| --- | --- | --- |
| **Business Schema V1.1** | 包含 `purchase_orders`, `inventory_moves`, `production_orders` 等核心資料表定義。 | 業務規則（如：FIFO 扣料、BOM 版本鎖定）已經固化在資料庫結構中。 |
| **Domain Logic Definitions** | 確認了「Backflush (倒扣料)」、「工單作廢退庫」等核心邊界。 | 程式邏輯不需要再猜需求，照著文件寫即可。 |

### 🛑 2. 當前狀態 (Current Status) — **尚未開始 coding**

* 目前只有 SQL 檔案，**沒有後端 API (Node/Go)，沒有前端畫面 (React/Vue)**。
* 使用者無法操作，只能透過資料庫管理工具看 Table。

### 🚀 3. 下一步目標 (Upcoming Objectives)

| 順序 | 任務代號 | 任務名稱 (What) | 驗收標準 (Acceptance Criteria) |
| --- | --- | --- | --- |
| **1** | **APP-01** | **後端骨架 (Skeleton & Auth)** | 建立 API Server 專案。實作 `/login` (換取 JWT) 與 `/switch-company` (切換租戶 Context)。Postman 測試通過。 |
| **2** | **APP-02** | **採購閉環 (Purchase Loop)** | **UI+API**：建立 PO (採購單) → 執行 GRN (收貨) → 庫存表 (Stock) 增加。需展示畫面截圖。 |
| **3** | **APP-03** | **生產閉環 (Production Loop)** | **UI+API**：建立 MO (工單) → 執行 Backflush (領料) → 原料扣除、成品增加。需驗證 Lot Tracking (批號追蹤)。 |
| **4** | **APP-04** | **多裝置適配 (Responsive UI)** | 同一套網頁在「電腦」與「手機/PDA」上都能操作（尤其是報工畫面）。 |

---

## 4. 兩軌如何協作 (Interaction)

這兩條軌道不是平行的，它們有**關鍵依賴點 (Checkpoints)**：

1. **INFRA-01 (Fix Restore)** 必須在 **APP-02 (採購閉環)** 之前完成。
* *原因*：開發業務功能時會頻繁寫壞資料，如果不能「一鍵重置」，開發效率會極低。


2. **APP-01 (Auth)** 必須依賴 **Stage 2C (已完成)** 的 Tenant Schema。
* *原因*：登入時必須讀取 `sys_tenants` 來發放正確的 Token。



## 5. 給 Agent 的執行指令 (Actionable Plan)

為了讓 Claude Code 開始工作，請依序下達以下指令（SVC）：

1. **[高優先] SVC-INFRA-01**: "修復 `make reset` 流程，解決 `restore.sh` 中的 FK 依賴錯誤，確保開發環境可隨時重置。"
2. **[次優先] SVC-APP-01**: "初始化後端專案 (NestJS/Go)，連接現有 DB，實作基於 JWT 的多租戶登入 API。"
3. **[待命] SVC-APP-02**: "實作採購收貨 (PO -> GRN) 的最小可行 UI 與 API。"

---

這份拆解是否夠清楚？如果滿意，我將以此邏輯作為後續所有 SVC (Service Task) 的派發標準。