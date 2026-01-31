# SVC-APP-021A: Demo Replay & Smoke Test Inventory Report

> **Version**: 1.0
> **Date**: 2026-02-01
> **Status**: Active
> **Related SVC**: SVC-APP-021C

---

## 1. Purpose & Scope

本文件記錄 Demo 環境重播與冒煙測試的完整盤點，包括：
- 可用的腳本與執行順序
- 資料來源與依賴關係
- 驗收標準與限制條件

**適用場景**：
- Demo 環境初始化
- 開發環境重置
- 新人 Onboarding 驗證
- CI/CD Gate 檢查點

---

## 2. Quick Start (TL;DR)

```bash
# 一鍵執行完整 Gate（約 60-90 秒）
make gate-demo-smoke

# 預期輸出：
# [GATE PASS] Demo environment ready for use
```

---

## 3. Scripts Inventory

### 3.1 Gate Entry Point

| 腳本 | 路徑 | 說明 |
|------|------|------|
| **gate_demo_replay_smoke.sh** | `scripts/gate_demo_replay_smoke.sh` | 一鍵入口，串接下列三步驟 |

### 3.2 執行鏈

```
┌────────────────────────────────────────────────────┐
│ Step 1: gate_app02.sh                              │
│   └─ DB Replay (Phase1 → Stage2B → Stage2C)        │
│   └─ Seed (auth + purchase + mo + backflush)       │
│   └─ Newman Gate (API 功能測試)                     │
└────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────┐
│ Step 2: dev_restart_api.sh                         │
│   └─ Kill existing API process                     │
│   └─ Start fresh API on port 3001                  │
│   └─ Verify /health + /uoms routes                 │
└────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────┐
│ Step 3: smoke/demo_smoke_master_data.sh            │
│   └─ GET /health → 200                             │
│   └─ POST /login → 200 + token                     │
│   └─ GET /suppliers → 200 + count > 0              │
│   └─ GET /uoms → 200 + count > 0                   │
│   └─ GET /items → 200 + count > 0                  │
└────────────────────────────────────────────────────┘
```

### 3.3 Individual Scripts

| 腳本 | 路徑 | 用途 | 可單獨執行 |
|------|------|------|-----------|
| gate_app02.sh | `scripts/gate_app02.sh` | DB 重播 + Newman 測試 | Yes |
| dev_restart_api.sh | `scripts/dev_restart_api.sh` | API 重啟 + 路由驗證 | Yes |
| demo_smoke_master_data.sh | `scripts/smoke/demo_smoke_master_data.sh` | Master Data 冒煙測試 | Yes |

---

## 4. Data Sources

### 4.1 Database Replay Chain

| 階段 | 腳本 | 說明 |
|------|------|------|
| Phase1 | `scripts/db/00_replay_phase1_v1_1.sh` | 基礎 Schema + 最小 E2E 資料 |
| Stage2B | `scripts/db/01_replay_stage2b_rbac_v1_0.sh` | RBAC + Org/HR Schema |
| Stage2C | `scripts/db/02_replay_stage2c_company_scope_v1_0.sh` | Company Scope RLS |

### 4.2 Seed Files

| Seed 檔案 | 路徑 | 內容 |
|-----------|------|------|
| 001_auth_test_users.sql | `apps/api/seeds/` | 測試使用者 (admin@demo.local) |
| 002_purchase_test_data.sql | `apps/api/seeds/` | 採購測試資料 |
| 003_production_mo_data.sql | `apps/api/seeds/` | 生產工單資料 |
| 004_backflush_data.sql | `apps/api/seeds/` | 反沖測試資料 |
| 005_master_data_uoms.sql | `apps/api/seeds/` | UOM 主資料 |
| 008_demo_master_data_seeds.sql | `apps/api/seeds/` | Demo 主資料 |
| 010_demo_master_data.sql | `apps/api/seeds/` | 最新 Demo 資料 |

### 4.3 Test Credentials

| 項目 | 值 | 來源 |
|------|------|------|
| Email | `admin@demo.local` | 001_auth_test_users.sql |
| Password | `Test@123` | 001_auth_test_users.sql |
| Company ID | `00000000-0000-0000-0000-000000000001` | Demo Tenant |

---

## 5. Acceptance Criteria

### 5.1 Gate PASS 條件

| 檢查項 | 期望值 | 說明 |
|--------|--------|------|
| Exit Code | 0 | 腳本正常結束 |
| /health | 200 | API 服務存活 |
| /login | 200 | 認證功能正常 |
| /suppliers | 200, count > 0 | 供應商資料非空 |
| /uoms | 200, count > 0 | 單位資料非空 |
| /items | 200, count > 0 | 料號資料非空 |

### 5.2 Idempotency 驗證

Gate 必須可重複執行：
```bash
# 連續執行兩次，第二次仍應 PASS
make gate-demo-smoke && make gate-demo-smoke
```

---

## 6. Limitations & Known Issues

### 6.1 環境限制

| 限制 | 說明 | Workaround |
|------|------|------------|
| Docker 必須運行 | DB 容器 `sipaios-postgres` 必須存在 | 執行 `docker compose up -d` |
| Port 3001 | API 預設使用 3001 | 設置 `API_PORT=3002` 覆蓋 |
| Node.js | 需要 npm 執行 Newman | 確保 Node.js 已安裝 |

### 6.2 已知問題

| 問題 | 狀態 | 說明 |
|------|------|------|
| Newman DeprecationWarning | WARN | 來自 newman 依賴，不影響功能 |
| 首次執行較慢 | Expected | DB Restore 需要時間 |

---

## 7. Troubleshooting

### 7.1 Login 失敗

**症狀**：Smoke test 在 login 步驟失敗

**診斷**：
```bash
# 檢查 API 是否運行
curl http://localhost:3001/health

# 檢查 seed 是否執行
docker exec sipaios-postgres psql -U sipaios -d sipaios \
  -c "SELECT email FROM sys_users WHERE email='admin@demo.local'"
```

**解決**：
```bash
# 重新執行完整 replay
make reset
./scripts/dev_restart_api.sh
```

### 7.2 Master Data 為空

**症狀**：/suppliers, /uoms, /items 回傳空陣列

**診斷**：
```bash
# 檢查 DB 資料
docker exec sipaios-postgres psql -U sipaios -d sipaios \
  -c "SELECT COUNT(*) FROM suppliers; SELECT COUNT(*) FROM uoms; SELECT COUNT(*) FROM items;"
```

**解決**：
```bash
# 重新執行 gate（包含 seed）
make gate-demo-smoke
```

### 7.3 API 404

**症狀**：API 路由回傳 404

**診斷**：
```bash
# 檢查 API 進程
lsof -i:3001
```

**解決**：
```bash
# 重啟 API
./scripts/dev_restart_api.sh
```

---

## 8. Artifacts

### 8.1 Gate 執行記錄

每次 `gate_app02.sh` 執行會在以下位置產生記錄：

```
artifacts/gate/app02/{timestamp}/
├── 01_replay.log      # DB Replay 日誌
├── 02_seed.log        # Seed 執行日誌
├── 03_newman.log      # Newman 測試日誌
├── 04_summary.txt     # 執行摘要
└── newman-results.json # Newman 詳細結果
```

### 8.2 API 日誌

```
artifacts/api-dev.log   # API Server 啟動日誌
```

---

## 9. Related Documents

| 文件 | 路徑 | 說明 |
|------|------|------|
| Wiring Matrix | `doc/runbooks/021B_wiring_matrix.md` | UI→API→DB 路徑對照 |
| Stage2A Replay | `doc/runbooks/STAGE2A_PHASE1_ONE_CLICK_REPLAY.md` | Phase1 重播說明 |
| API Contract | `doc/runbooks/api_contract_work_orders.md` | Work Orders API 契約 |

---

## Changelog

| 版本 | 日期 | 變更 |
|------|------|------|
| 1.0 | 2026-02-01 | 初版，SVC-APP-021C 交付 |
