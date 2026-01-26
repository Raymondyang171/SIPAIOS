# Outsource-Track（SIP AIOS｜ERP/MES/WMS 平台）— Repo 說明書

- 文件版本：v2.1-aligned
- 對齊來源：《ERP/MES/WMS 平台完整計畫書 v2.1（Production-Hardened｜最優解整合版）》
- 核心哲學：**穩定壓倒一切**（KPI：上線後半夜不響手機）
- 交付策略：**一套代碼、兩種交付、同一套維運防線**（SaaS 孵化 → On-Prem 搬遷）

---

## 0) 這個 Repo 是什麼（Scope）
- 本 Repo：Outsource-Track（工程/現場回報為核心的 ERP/MES/WMS 子系統）
- 目標：支援
  - 現場報工、資料回報、附件（照片/文件）上傳
  - 基礎權限控管（Org/Unit/Roles）
  - 對外整合（Webhook / ERP）
  - 遷移（SaaS → On-Prem）與可維運（備份/回滾/診斷）

> 重要：本 Repo 文件以 v2.1 的「防禦性設計 + 維運基線 + 遷移可驗證」為第一優先；功能需求若與穩定性衝突，請先提高穩定性門檻再談功能擴張。

---

## 1) 交付模式（對齊 Plan §1）
### 1.1 SaaS 孵化（Dev / Pilot）
- 目標：快速交付，但必須做到：**客戶 A 的事故不拖垮客戶 B**
- v2.1 上限策略：**每客戶獨立 Stack**
  - 優點：隔離最佳、搬遷零痛苦、故障域最小
  - 代價：成本略高，但在 <5 客戶/年階段可承受（v2.1 明確取捨）

### 1.2 On-Prem 搬遷（Hybrid Appliance / Software Appliance）
- 目標：**整機搬遷一致**（DB + Storage + Config 一包帶走）
- v2.1 標準：Offline Copy（適用 DB <100GB），RTO（停機）< 2 小時
- DB >100GB：Replica Switch 為選配（非 v2.1 必交付）

---

## 2) 架構拓撲（對齊 Plan §2）
- v2.1 每客戶一套標準元件：
  - Gateway：Nginx（TLS、快取、IP allowlist、基礎 DDoS/Rate Limit）
  - App Core：無狀態 API（RBAC/Scope、設備信任、版本路由、整合端點）
  - Worker：獨立容器（報表、排程、Webhook 重送、維護任務）
  - DB：PostgreSQL 15/16+
  - Cache/Queue：Redis 7+
  - Storage：MinIO 或本地 Volume（On-Prem 常見）

> Repo 目前可能採用 Supabase（SaaS 模式），但文件以 v2.1 的「可搬遷、可替換」為導向：不要把供應商當成架構本體。

---

## 3) v2.1 必守的防禦性設計（對齊 Plan §3）
### 3.1 Rate Limiting（雙層：Nginx + App）
- Nginx（IP 級）
  - 參考：50 req/s，burst 20（抵擋粗暴流量）
- App（業務級，Redis 計數）
  - Login：5 次失敗/分鐘 → 鎖帳號或鎖 IP（可配置）
  - Report Export：5 次/小時（避免 IO 被挖礦）
  - General API：300 次/分鐘/裝置（避免 PDA bug 死循環）

### 3.2 Timeout & Circuit Breaker
- App → DB：query timeout（例：10~30s 分級）
- App → 外部 ERP/Webhook：30s（一般）、60s（大型 payload）
- Worker 任務硬超時：
  - 一般：30s
  - 報表：15m（上限）
- 失敗任務 TTL：7 天自動清除（避免 Redis 撐爆）

### 3.3 Webhook：重試 + 降級 + 一鍵停用
- 重試：Exponential Backoff（1m → 5m → 30m → 2h → … 最多 10 次）
- 超過：標記 dead + 告警
- 認證模式（v2.1 必備）：
  - HMAC（預設）
  - BEARER（降級：老舊 ERP）
  - IP_ONLY（最低安全：僅 On-Prem、內網、需明確風險確認）

---

## 4) 看板即時策略（對齊 Plan §4）
- v2.1 標準版（預設）：短輪詢 5 秒（穩定優先）
- 企業選配：WebSocket（心跳、重連、降級回輪詢）
- 設計原則：
  - 看板允許 5~10 秒延遲 → 用輪詢換穩定
  - 輪詢端點需：快取 1~2 秒 + ETag/If-None-Match + Rate Limit

---

## 5) PDA/設備治理（對齊 Plan §5）
- 強制更新（必備）：
  - DB 記錄最低版本 `sys_min_app_version`
  - PDA 啟動/喚醒 → `/api/v1/system/version-check`
  - < min_version：全畫面阻擋要求更新
  - SaaS：導 Google Play/MDM
  - On-Prem：提供 `/download/latest.apk`
- Kiosk Mode（建議）：
  - 方案 A：Android Lock Task / Dedicated Device（推薦）
  - 方案 B：MDM（Android Enterprise）
  - 方案 C：工業 PDA 原廠管控（Zebra/Honeywell/Chainway）

---

## 6) 核心資料模型（對齊 Plan §6）
- v2.1 必備（應具備）：
  - `sys_schema_version`（版本硬檢查：App 啟動必比對）
  - `sys_idempotency_keys`（避免重複入庫/扣庫）
  - `sys_webhooks.auth_mode`、`sys_webhooks.bearer_token`（HMAC/BEARER/IP_ONLY）
  - `sys_devices`（設備信任：版本、最後活躍、撤銷）
  - `sys_audit_logs`（稽核事件字典化）
- 若 Repo 現況尚未具備：
  - 請先落地 schema 與最小 API gate，再擴功能

---

## 7) PostgreSQL 維護基線（對齊 Plan §7）
- 慢查詢：
  - `log_min_duration_statement=500ms`
- Autovacuum：
  - 對高頻表下修 scale factor（避免越用越慢）
- Worker 每日輸出 Top SQL 報告（或至少有 log + 分析流程）

---

## 8) API 版本管理（對齊 Plan §8）
- Path versioning：`/api/v1/...`（未來可 `/api/v2/...`）
- 支援政策：N-1（舊版保留 6~12 個月）
- 破壞性變更：只能在 v2 發生

---

## 9) Worker 佇列（對齊 Plan §9）
- Priority（數字越小越急）：
  - P1：使用者等待中（即時匯出/即時計算）
  - P2：流程任務（通知/同步）
  - P3：排程（報表/批次）
  - P4：維護（歸檔/清理/月結）
- 必備：Quota（避免 P4 塞爆）+ DLQ（死信佇列）

---

## 10) 遷移、備份與 DR（對齊 Plan §10~11）
- 遷移（標準交付：Offline Copy）：
  - export：DB dump + storage snapshot + config + manifest（含 schema_version + checksums）
  - transfer：加密封裝
  - import：還原 DB + volumes → health check → 切換
  - SaaS 保留 30 天只讀（回滾保險）
- 備份演練：
  - 季度：完整性驗證 + 測試環境還原
  - 年度：DR 全流程演練（測 RTO/RPO）
  - 重大升級前：必做還原驗證

---

## 11) 監控與可觀測性（對齊 Plan §12~13）
- `/health`：DB / Redis / Storage / Queue
- API metrics（JSON）：requests/min、db connections、queue depth、disk usage（可先簡化）
- 前端：Global Error Boundary + 自動回報（含 tenant_id、device_id）

---

## 12) 效能 SLA（對齊 Plan §14）
| API 類型 | P50 | P95 | P99 | Timeout |
|---|---:|---:|---:|---:|
| 查詢（單筆） | <100ms | <300ms | <500ms | 10s |
| 查詢（列表） | <200ms | <500ms | <1s | 15s |
| 寫入（單筆） | <150ms | <400ms | <800ms | 10s |
| 批次操作 | <500ms | <2s | <5s | 30s |
| 報表匯出 | <5s | <30s | <60s | 900s |

---

## 13) 文件與資源索引 (Documentation Map v2.1)

本專案採用「文件即代碼 (Docs as Code)」原則，所有架構、規範、維運手冊皆已標準化。

### 1. 戰略與全貌
- **00_INDEX.md**：文件的閱讀順序導覽（Map）。
- **SIP AIOS 計畫書 V2.1.txt**：原始商業需求與願景。
- **CONTEXT.md**：決策背景、技術選型邊界與「不做什麼」。
- **LLM_GUARDRAILS_AND_PROMPTS_ONPREM_V2_1.md**：給 AI 的開發指令集與紅線。

### 2. 核心架構 (Core)
- **ARCHITECTURE.md**：容器拓撲、資源柵欄、服務邊界定義。
- **API_SPECIFICATION.md**：API 骨架、Idempotency、Webhook 整合標準（含原 Integration Guide）。
- **SECURITY_MODEL.md**：零信任架構、Service Account、Device Trust 模型。
- **AI_AGENT_CONTRACT.md**：Agent 權限邊界、操作閾值與 Kill Switch（含原 Agents 定義）。

### 3. 交付與維運 (Delivery & Ops)
- **INSTALL.md**：全新主機安裝 SOP 與 Self-Check 清單。
- **UPDATE_MECHANISM.md**：Pull-Based 更新策略、離線包與回滾機制。
- **OPS_RUNBOOK.md**：日常維運手冊、故障排除 SOP。
- **MIGRATION_PLAYBOOK.md**：SaaS 轉 On-Prem 的遷移與資料清洗流程。
- **DISASTER_RECOVERY_PLAN.md**：災難復原演練、RTO/RPO 定義與資料一致性策略。
- **DATA_RETENTION_POLICY.md**：資料保留週期、冷熱分層與清理策略。

### 4. 裝置與指標 (Device & Metrics)
- **HARDWARE_SIZING_GUIDE.md**：硬體規格選型 (S/M/L) 與容量估算公式。
- **PDA_DEVICE_MANAGEMENT.md**：PDA 裝置管理、Kiosk 模式與離線對策。
- **DIAGNOSTICS_BUNDLE.md**：遠端診斷包規格與脫敏規範。
- **REFERENCES.md**：外部參考資料與權威來源索引。

---

## 14) 快速開始（Development）
### 14.1 前置需求
- Node.js：建議 LTS（以專案 lockfile/CI 為準）
- Package manager：建議 pnpm（避免 npm/pnpm 混用造成 lockfile 污染）
  - `corepack enable`
  - `corepack prepare pnpm@latest --activate`

### 14.2 安裝與啟動
```bash
pnpm install
pnpm dev

14.3 環境變數（示意）
請使用 .env.local，嚴禁提交 secrets。 常見（依 Repo 實作而定）：

NEXT_PUBLIC_SUPABASE_URL

NEXT_PUBLIC_SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY

DATABASE_URL（On-Prem 或自管 DB）

REDIS_URL

STORAGE_ENDPOINT

注意：如果你使用 Supabase 下載 schema，建議使用 ~/.pgpass 或環境變數方式避免互動輸入卡住。

15) Release / On-Prem Readiness（最小驗收）
/health 正常（DB/Redis/Storage/Queue）

schema_version gate：App 與 DB 一致（不一致拒啟動/拒服務）

Rate limit 雙層：Nginx + App

Timeout 完整：App→DB、外部、Worker

Webhook：重試/死信/停用 + HMAC/BEARER/IP_ONLY

Retention cleanup：有排程、可產出報告

Backup→Restore：至少一次在測試環境成功還原

16) 安全與合規（最低要求）
Secrets：嚴禁提交 .env*、service key、token、私鑰、含客戶資料的 dumps

多租戶隔離：

v2.1 推薦：每客戶獨立 stack

若共用 DB：必須有嚴格 RLS + 資源柵欄（Rate limit/timeout/retention/idempotency）

最後提醒：如果你覺得規範很多，那是因為事故更貴（而且會挑你睡覺時發生）。