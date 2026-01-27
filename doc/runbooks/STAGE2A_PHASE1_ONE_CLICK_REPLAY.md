# Stage 2A Runbook — Phase1 v1.1 一鍵重播（Restore → Seed → Verify）

> 目的：把 Phase1 v1.1 的 DB 基線流程收斂成「單入口、可重播、可驗證、可回滾」的維運地基。

---

## 0) 紅線（Hard Rules）

- artifacts 產物必須被 gitignore（不得入庫）
- 不得在腳本或輸出中寫入/列印任何 secrets（密碼/連線字串）
- 必須保留可回滾方式（restore baseline 即回滾）

---

## 1) 你應該已具備的前置條件（Phase1 v1.1 已完成）

- 已存在並可執行的 baseline restore 腳本：
  - `./scripts/db/08_restore_latest_phase1_baseline.sh`
- 已存在 Phase1 ops/verify SQL（可能是 `99_phase1_verify.sql`，也可能是日期前綴版本如 `20260126_99_phase1_verify.sql`）
- 已存在最小閉環 seed/verify SQL：
  - `20260127_12_phase1_seed_min_e2e.sql`
  - `20260127_13_phase1_verify_min_e2e.sql`
- DB 容器已啟動：預設 `sipaios-postgres`
- `.gitignore` 已忽略 `artifacts/`

---

## 2) 單入口腳本（One-click Entry）

- 入口：`./scripts/db/00_replay_phase1_v1_1.sh`
- 流水線：
  1. restore baseline（回到乾淨可重播狀態）
  2. seed min_e2e（建立最小閉環資料）
  3. verify seed（SQL + 14 張表 row count = 1 斷言）
  4. phase1 verify（執行 Phase1 verify SQL；支援日期前綴檔名自動偵測）
  5. 產出固定摘要（可貼到 issue / PR 作為驗收錨點）

---

## 3) 如何執行（WSL / Ubuntu）

在 repo root：

- 直接跑（預設容器與帳號）：
  - `bash ./scripts/db/00_replay_phase1_v1_1.sh`

- 若你的容器/帳號/DB 名稱不同，可用環境變數覆寫：
  - `DB_CONTAINER=sipaios-postgres DB_USER=sipaios DB_NAME=sipaios bash ./scripts/db/00_replay_phase1_v1_1.sh`


- 若你的 ops/seed/verify SQL 路徑不同，可用以下環境變數覆寫（建議先用 `find` 找到檔案實際位置）：  
  - 覆寫 ops 目錄：`PHASE1_OPS_DIR=<path>`  
  - 覆寫 seed SQL：`PHASE1_SEED_SQL=<path>`  
  - 覆寫 seed verify SQL：`PHASE1_SEED_VERIFY_SQL=<path>`  
  - 覆寫 Phase1 verify SQL（最推薦，直接給完整路徑）：`PHASE1_VERIFY_SQL=<path>`  
  - 或只覆寫 verify 檔名（在 ops dir 內找）：`PHASE1_VERIFY_SQL_NAME=<filename>`  

範例：  
- `PHASE1_OPS_DIR=supabase/ops PHASE1_VERIFY_SQL_NAME=99_verify.sql bash ./scripts/db/00_replay_phase1_v1_1.sh`  
- `PHASE1_VERIFY_SQL=phase1_schema_v1.1_sql/supabase/ops/99_phase1_verify_v1_1.sql bash ./scripts/db/00_replay_phase1_v1_1.sh`  

---

## 4) 驗收錨點（每次跑完必須看到的固定摘要）

腳本最後一定會輸出以下區塊（欄位固定、方便比對）：

- `=== PHASE1_REPLAY_SUMMARY ===`
- `public_tables_count=...`
- `core_tables_count=...`
- `seed_rows_ok=14/14`
- `verify_phase1=PASS`
- `run_dir=artifacts/replay/phase1_v1.1/<timestamp>`

### core tables count 的定義（必須固定，避免口徑漂移）

- core tables = `public` schema 的 base tables，排除以下類型（腳本內有明確規則）：
  - `sys_*`
  - `drizzle_*`
  - `schema_migrations`
  - `supabase_migrations`

> 若你未來要改 core 的定義：請同步修改腳本內 `EXCLUDE_TABLE_PATTERNS`，並在此處更新說明。

---

## 5) 產物位置（Artifacts）

每次執行會在下列目錄產出 runlogs（建議永久保留在本機或安全儲存）：

- `artifacts/replay/phase1_v1.1/<timestamp>/`
  - `01_restore.log`
  - `02_seed.log`
  - `03_seed_verify.log`
  - `04_phase1_verify.log`
  - `05_summary.txt`

---

## 6) 常見失敗與處置（Troubleshooting）

- 失敗：`DB container not running`
  - 檢查 docker 是否啟動、容器名稱是否正確（`docker ps`）

- 失敗：`Restore script not found or not executable`
  - 確認檔案存在、具可執行權限（`chmod +x`）

- 失敗：`Cannot find ops dir / seed sql`
  - 代表 repo 內路徑與預設不同
  - 做法：用環境變數指定正確位置

- 失敗：`seed table ... count != 1`
  - 代表 seed 沒有成功寫入或被 rollback
  - 先看 `02_seed.log` / `03_seed_verify.log` 找出第一個 ERROR

- 失敗：`verify_phase1=FAIL`
  - 先看 `04_phase1_verify.log` 內的 `ERROR:` 或 `FATAL:`

---

## 7) 回滾策略（Rollback）

- 本流程的回滾就是「再跑一次 restore baseline」
- 若你要回到某個特定基線：
  - 由 `08_restore_latest_phase1_baseline.sh` 的策略決定（latest / 指定 timestamp）

