# CONTEXT — Outsource-Track（對齊 SIP AIOS 計畫書 v2.1）

- 目的：本文件是「人類 + AI Agent」共享的決策底稿  
- 原則：所有架構/DB/權限/交付決策需對齊《計畫書 v2.1》  
- KPI：**可交付、可維運、可搬遷**（功能可以迭代，事故不能迭代）

---

## 1) v2.1 摘要（Plan §0）
- 核心哲學：穩定壓倒一切（上線後半夜不響手機）
- 適用場景：SaaS 孵化 → On-Prem 搬遷（Hybrid Appliance）
- 規模假設：每客戶 <50 使用者（含 PDA/設備）；每年新客戶 <5
- 交付策略：一套代碼、兩種交付、同一套維運防線
- v2.1 主軸：補齊「防禦性設計 + 維運基線 + 遷移可驗證」，移除 <5 客戶階段的過度工程

---

## 2) 目標與邊界（Plan §1）
### 2.1 SaaS 目標
- 快速交付
- 必須滿足：客戶 A 的事故不拖垮客戶 B
- 上限策略：每客戶獨立 stack（小客數可承受，換隔離 + 搬遷零痛苦）

### 2.2 On-Prem 目標
- 整機搬遷一致：DB + Storage + Config 一包帶走
- RTO（停機）< 2 小時（DB <100GB 的 Offline Copy）
- DB >100GB：Replica 切換為選配（非 v2.1 必交付）

### 2.3 明確不做（避免過度工程，Plan §1）
- 不預設 PgBouncer（<50 使用者階段，App pool 足夠）
- 不預設硬體 watchdog（Docker restart policy + health check 優先）
- 不做複雜 GDPR 物理刪除（軟刪除 + 脫敏 + 保留稽核）

---

## 3) 架構拓撲（Plan §2）
### 3.1 v2.1 標準元件（每客戶一套）
- Gateway：Nginx
  - TLS 終止、靜態快取、IP allowlist、基礎 DDoS/Rate Limit
- App Core：無狀態 API（Node.js 或 Go）
  - API、RBAC/Scope、設備信任、整合端點、版本路由
- Worker：獨立容器（Node.js 或 Go）
  - 報表、匯入匯出、排程、Webhook 重送、維護任務（Vacuum/Retention/Log Analyze）
- DB：PostgreSQL 15/16+
- Cache/Queue：Redis 7+
- Storage：MinIO 或本地 Volume（On-Prem 常見）

### 3.2 Repo 現況（需以 evidence 更新）
- 本 Repo 多數場景採：Next.js +（SaaS）Supabase
- 若現況與 v2.1 目標不一致：
  - 文件不得硬寫「已完成」
  - 必須以「現況 / 差距 / 待補」呈現

> Evidence 規範：任何聲稱「已實作」的事項，需補：檔案路徑 + 行號區間 + 一句結論（避免腦補）。

---

## 4) 防禦性設計（Plan §3）
### 4.1 Rate Limiting（雙層：Nginx + App）
- Nginx（IP 級）：
  - limit_req_zone：50 req/s，burst 20
- App（Redis 計數）：
  - Login：5 次失敗/分鐘 → 鎖帳號或鎖 IP（可配置）
  - Report Export：5 次/小時
  - General API：300 次/分鐘/裝置

### 4.2 Timeout & Circuit Breaker
- App → DB：query timeout（10~30s 分級）
- App → 外部 ERP/Webhook：30s（一般）、60s（大型 payload）
- Worker：
  - 一般任務：30s
  - 報表：15m（上限）
- 失敗任務 TTL：7 天自動清除（Redis 防爆）

### 4.3 Webhook（重試 + 降級 + 一鍵停用）
- Exponential Backoff：1m → 5m → 30m → 2h → … 最多 10 次
- 超過：dead + 告警
- 認證模式（v2.1 必備）：
  - HMAC（預設）
  - BEARER（降級）
  - IP_ONLY（最低安全：僅 On-Prem/內網/需風險確認）
- DB 欄位（v2.1）：`sys_webhooks.auth_mode`、`sys_webhooks.bearer_token`

---

## 5) 看板即時策略（Plan §4）
- v2.1 預設：輪詢 5 秒
- 企業選配：WebSocket（心跳、重連、降級回輪詢）
- 輪詢端點必做：
  - 快取 1~2 秒
  - ETag / If-None-Match
  - Rate Limit

---

## 6) PDA & 設備治理（Plan §5）
### 6.1 強制更新（必備）
- `sys_min_app_version`
- PDA 啟動/喚醒 → `/api/v1/system/version-check`
- < min_version：全畫面阻擋要求更新
  - SaaS：導 Google Play/MDM
  - On-Prem：`/download/latest.apk`

### 6.2 Kiosk Mode（建議交付）
- A：Android Lock Task / Dedicated Device（推薦）
- B：MDM（Android Enterprise）
- C：工業 PDA 原廠工具（Zebra/Honeywell/Chainway）

---

## 7) 核心資料模型（Plan §6）
### 7.1 v2.1 必備核心表（應具備）
- Tenant/Org：`sys_tenants`
- Users/Roles/Depts：`sys_users`、`sys_roles`、`sys_depts`
- RBAC：`sys_permissions`、`sys_role_permissions`、`sys_data_scopes`
- Device：`sys_devices`（last_active_at, app_version, revoked_at）
- License：`sys_license`（expires_at, grace_period_days, status）
- Ops：`sys_schema_version`（int）
- Audit：`sys_audit_logs`（事件字典化）

### 7.2 Idempotency（v2.1 必備）
- 寫入型 API 必須要求 `Idempotency-Key`
- 同 key 不同 payload：回 409
- 需要過期清除：index `expires_at`

---

## 8) PostgreSQL 維護基線（Plan §7）
- 慢查詢：`log_min_duration_statement=500ms`
- Autovacuum：對高頻表下修 scale factor
- 產出 Top SQL 報告（最少要求：可追查、可告警、可改進）

---

## 9) API 版本管理（Plan §8）
- 路徑版本：`/api/v1/...`、`/api/v2/...`
- 支援：N-1（6~12 個月）
- 破壞性變更：只在 v2

---

## 10) Worker 佇列（Plan §9）
- Priority：
  - P1：使用者等待
  - P2：流程任務
  - P3：排程
  - P4：維護
- 必備：Quota + DLQ

---

## 11) 遷移標準（Plan §10）
- Offline Copy（標準）：
  - Maintenance（只讀/凍結）
  - export：DB dump + storage snapshot + config + manifest（含 schema_version + checksums）
  - transfer：加密封裝
  - import：還原 → health check → 切換
  - SaaS 保留 30 天只讀（回滾保險）

---

## 12) 備份與 DR（Plan §11）
- 週期：
  - 季度：還原驗證（測試環境）
  - 年度：DR 全流程演練
  - 重大升級前：必做還原驗證

---

## 13) 監控與可觀測性（Plan §12）
- 不預設 Prometheus（v2.1 取捨）：先讓系統活下來
- 必備：
  - `/health`
  - metrics JSON（簡版即可）
  - queue depth / disk usage / db connections

---

## 14) 前端穩定性（Plan §13）
- Global Error Boundary（必備）
- 自動回報（最小欄位）：
  - message、stack、UA、timestamp、tenant_id、device_id

---

## 15) 效能 SLA（Plan §14）
| API 類型 | P50 | P95 | P99 | 超時 |
|---|---:|---:|---:|---:|
| 查詢（單筆） | <100ms | <300ms | <500ms | 10s |
| 查詢（列表） | <200ms | <500ms | <1s | 15s |
| 寫入（單筆） | <150ms | <400ms | <800ms | 10s |
| 批次操作 | <500ms | <2s | <5s | 30s |
| 報表匯出 | <5s | <30s | <60s | 900s |

---

## 16) 交付物構成 (Deliverables & Artifacts)

為確保 On-Prem 環境的長期可維護性，本專案不只交付代碼 (Code)，更交付全套治理規範 (Governance)。

### Type A: 執行標準 (Execution Standards)
*定義「系統該長什麼樣子」，開發者必須嚴格遵守。*
- **ARCHITECTURE.md**: 確保 Nginx/App/Worker 的職責不混亂，Docker 資源限制明確。
- **API_SPECIFICATION.md**: 確保所有 API 具備 Idempotency 與 Audit 能力，並標準化外部整合 (Webhook)。
- **SECURITY_MODEL.md**: 定義身分驗證、裝置信任與 Rate Limiting 策略。
- **AI_AGENT_CONTRACT.md**: 規範 AI Agent 的行為邊界（Kill Switch、Threshold），防止自動化災難。

### Type B: 維運手冊 (Operational Playbooks)
*定義「系統活著的時候該怎麼照顧」，供現場 IT 與維運人員使用。*
- **INSTALL.md**: 讓非技術人員也能完成「標準化安裝」。
- **UPDATE_MECHANISM.md**: 提供安全的「更新」與「回滾」路徑，拒絕手動 SQL 變更。
- **OPS_RUNBOOK.md**: 常見問題 (Disk Full, High CPU) 的標準處置 SOP。
- **DATA_RETENTION_POLICY.md**: 預先定義資料清理規則，防止磁碟爆滿。
- **DISASTER_RECOVERY_PLAN.md**: 定義備份策略與災難還原流程。

### Type C: 決策輔助 (Decision Support)
*定義「如何評估與準備」，供 PM 與採購人員使用。*
- **HARDWARE_SIZING_GUIDE.md**: 提供基於數據的硬體採購建議 (Tier S/M/L)。
- **PDA_DEVICE_MANAGEMENT.md**: 解決工廠現場裝置的控管與離線問題。

---

## 17) Repo 現況追蹤（務必維護）
- Current Phase：
  - Phase 2A：治理/文件基準（Org/Unit/RLS）
  - Phase 2B：落地 guard、去重路徑、強化 admin gate
- 任何重大決策變更（交付模式、RLS、DB schema、整合策略）必須更新本文件
  - 否則下一個 LLM 會很努力地做錯（而且錯得很有創意）。