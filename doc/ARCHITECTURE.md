# ERP/MES/WMS On-Prem 架構總覽 v2.1（每客戶一套｜可落地）

> 目標：一套客戶 = 一組獨立的 Gateway/App/Worker/DB/Cache/Storage  
> 核心哲學：穩定壓倒一切（事故隔離、可回復、可稽核）

---

## 1. 元件清單與責任邊界（Single Responsibility）

### 1.1 Gateway：Nginx
- 職責
  - TLS 終止（HTTPS）
  - 靜態資源快取（可選）
  - IP allowlist（管理端/整合端）
  - 基礎 DDoS/Rate Limit（依環境調整）
- 禁止事項
  - 不放商業邏輯
  - 不直接連 DB（只做反代與防線）

### 1.2 App Core：Node.js 或 Go（無狀態）
- 職責
  - API（REST/gRPC 由你選定，建議 REST 起步）
  - RBAC/Scope（授權：誰可以做什麼）
  - 設備信任（Device Trust / Device Allowlist）
  - 整合端點（Webhook 接收/簽章驗證/版本路由）
  - 版本路由（/api/v1、/api/v2 或 header-based versioning）
- 狀態原則
  - 不保存 session state 在本機記憶體
  - 一切狀態進 DB/Redis（可水平擴充）

### 1.3 Worker：Node.js 或 Go（獨立容器）
- 職責（非同步/長任務）
  - 報表生成
  - 匯入匯出（CSV/Excel/PDF）
  - 排程（Cron jobs）
  - Webhook 重送（Retry + Dead letter）
  - 維護任務（Vacuum、Retention、Log Analyze）
- 原則
  - 與 App Core 解耦（以 Queue/Redis Stream/Job table 溝通）
  - 失敗可重試、可追蹤、可取消（至少要有 job 狀態）

### 1.4 DB：PostgreSQL 15/16+
- 職責
  - 單一事實來源（Single Source of Truth）
  - 交易一致性（出入庫、工單、報工等）
  - 審計（audit log / activity log，建議必備）
- 原則
  - schema 變更必須可追溯（migration）
  - 高風險操作需最小權限（不要把超級帳號散落在 app）

### 1.5 Cache/Queue：Redis 7+
- 職責
  - 快取（權限快取、session token blacklist、讀多寫少資料）
  - Queue（背景任務、事件、Webhook 重送）
- 原則
  - Redis 當「加速器」不是「唯一存放處」
  - 所有任務狀態仍需可回寫 DB（避免 Redis 遺失造成不可追）

### 1.6 Storage：MinIO 或本地 Volume
- 職責
  - 檔案（附件、報表、圖片、匯出檔）
- On-Prem 常見選擇
  - 小規模：本地 volume（簡單）
  - 需要 S3 相容/擴充：MinIO（建議）

---

## 2. 資料流（典型請求路徑）

### 2.1 同步路徑（使用者操作）
- Client（Browser/PDA） → Nginx → App Core → Postgres
- 若需要快取：App Core ↔ Redis
- 需要檔案：App Core ↔ Storage（MinIO/Volume）

### 2.2 非同步路徑（長任務/報表/重送）
- App Core 寫入 Job/事件（DB 或 Redis Queue）
- Worker 拉取任務 → 執行 → 回寫結果到 DB/Storage
- App Core 提供查詢狀態 API（job_id）

---

## 3. 權限與可見性（避免「改一下爆全場」的定義）

### 3.1 權限切分（建議最小可行分層）
- DB 層：資料完整性、外鍵、constraint（可選：RLS，但不強制）
- App Core：RBAC/Scope 的「最終裁決」（所有寫入/敏感讀取都必須過這層）
- UI：只做「顯示 gate」與「友善提示」，不可當安全邊界

### 3.2 UI 必備防呆（任何頁面都要有）
- 403/permission denied：顯示權限不足頁（不要 runtime crash）
- 0 rows：空狀態（空表格 + 行動引導）
- nullable 欄位：顯示 fallback（例如 "-"）避免 undefined 爆炸

---

## 4. Docker Compose（每客戶一套）資源柵欄 v2.1（可落地）

> 注意：Compose 的 deploy 區塊在某些環境可能被忽略  
> v2.1 以「可確實生效」寫法為主（cpus/mem_limit/pids_limit）

### 4.1 範本（節錄）
services:
  app:
    image: erp-core:v2.1
    restart: always
    cpus: "1.0"
    mem_limit: 2g
    mem_reservation: 512m
    pids_limit: 256

  worker:
    image: erp-worker:v2.1
    restart: always
    environment:
      JOB_TIMEOUT_MS: 900000
    cpus: "1.0"
    mem_limit: 2g
    mem_reservation: 512m
    pids_limit: 256

  db:
    image: postgres:16-alpine
    restart: always
    volumes:
      - ./data/db:/var/lib/postgresql/data
    mem_limit: 3g
    command:
      - "postgres"
      - "-c" ; "log_min_duration_statement=500"
      - "-c" ; "autovacuum_max_workers=3"
      - "-c" ; "autovacuum_naptime=10s"
      - "-c" ; "autovacuum_vacuum_scale_factor=0.05"
      - "-c" ; "autovacuum_analyze_scale_factor=0.02"

  redis:
    image: redis:7-alpine
    restart: always
    mem_limit: 512m

---

## 5. 為什麼不用 POSTGRES_INITDB_ARGS -c ...（一句話版）
- POSTGRES_INITDB_ARGS 是 initdb 初始化叢集階段用參數；runtime 設定應透過 postgres 啟動參數（-c）或 postgresql.conf 注入。

---

## 6. 最小維運基線（建議上線前就具備）
- 備份/還原演練（DB + Storage）
- Audit log（誰在何時對何資料做了什麼）
- Worker 任務可追蹤（job 狀態、重試次數、最後錯誤）
- Gateway 基礎防線（IP allowlist、rate limit）
- 監控最小集（CPU/RAM/磁碟、DB 連線數、慢查詢、Redis 記憶體）

---
