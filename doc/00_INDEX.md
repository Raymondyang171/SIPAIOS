# 00_INDEX — SIP AIOS 專案文件導覽 (Map)

- 文件版本：v2.1
- 目的：指引 LLM 與開發者正確的「閱讀順序」與「依賴關係」

---

## 1. 戰略總綱 (Strategy & Context)
> **閱讀優先級：最高**。若不理解這裡，寫出來的 code 都是錯的。

- **`README.md`**
  - **角色**：專案入口與說明書。
  - **核心內容**：交付模式（SaaS/On-Prem）、Repo 結構、核心防禦哲學。
- **`SIP AIOS 計畫書 V2.1.txt`**
  - **角色**：原始商業需求與願景（The Bible）。
- **`CONTEXT.md`**
  - **角色**：決策背景與邊界（Boundaries）。
  - **用途**：告訴你「為什麼不選 PgBouncer」、「為什麼要做 Offline Copy」。
- **`LLM_GUARDRAILS_AND_PROMPTS_ONPREM_V2_1.md`**
  - **角色**：給 AI 的指令集。
  - **用途**：規範 LLM 產出代碼時的格式、紅線與檢查點。

---

## 2. 核心架構與規範 (Core Architecture)
> **開發依賴**：實作任何功能前必讀。

- **`ARCHITECTURE_ONPREM_V2_1.md`** (建議改名為 ARCHITECTURE.md)
  - **內容**：Nginx/App/Worker/DB/Redis 的容器拓撲與資源柵欄。
- **`API_SPECIFICATION.md`**
  - **內容**：API 介面骨架、Idempotency、Webhook 整合標準 (含原 Integration Guide)。
- **`SECURITY_MODEL.md`**
  - **內容**：Device Trust、Rate Limit、RBAC、Service Account 安全模型。
- **`AI_AGENT_CONTRACT.md`**
  - **內容**：Dev Agent 與 Runtime Agent 的權限邊界、Kill Switch、操作閾值 (含原 Agents 定義)。
- **`DATA_RETENTION_POLICY.md`**
  - **內容**：資料保留天數、清理策略、磁碟水位控制。
## 🛠️ Stage 2A: Database Operations
- [Phase 1 One-Click Replay](./runbooks/STAGE2A_PHASE1_ONE_CLICK_REPLAY.md) 
  - *用途：一鍵還原資料庫、灌入 Demo 資料並自動驗證*

## 🏗️ Architecture & Design
- [System Architecture](./ARCHITECTURE.md)
  - *用途：定義 SIPAIOS 核心架構、資料流與模組化邏輯*




---

## 3. 交付與維運 (Delivery & Ops)
> **落地依賴**：安裝、更新、救火必讀。

- **`INSTALL.md`**
  - **用途**：全新主機安裝 SOP、Self-Check 清單。
- **`UPDATE_MECHANISM.md`**
  - **用途**：Pull-Based 更新、離線包匯入、回滾策略。
- **`OPS_RUNBOOK.md`**
  - **用途**：日常維運、SOP 對照表（Disk Full / P95 High / Backup Fail）。
- **`MIGRATION_PLAYBOOK.md`**
  - **用途**：從 SaaS 遷移到 On-Prem 的標準作業程序 (Offline Copy)。
- **`DISASTER_RECOVERY_PLAN.md`**
  - **用途**：災難復原演練紀錄模板 (RTO/RPO)。
- **`DIAGNOSTICS_BUNDLE.md`**
  - **用途**：遠端支援用的診斷包規格與脫敏規範。

---

## 4. 硬體與設備 (Hardware & Devices)
- **`HARDWARE_SIZING_GUIDE.md`**
  - **用途**：硬體規格建議 (Tier S/M/L) 與容量估算公式。
- **`PDA_DEVICE_MANAGEMENT.md`**
  - **用途**：PDA 版本控管、Kiosk 模式、離線資料一致性處理。

---

## 5. 其他 (Misc)
- **`REFERENCES.md`**
  - **用途**：外部權威資料來源索引。