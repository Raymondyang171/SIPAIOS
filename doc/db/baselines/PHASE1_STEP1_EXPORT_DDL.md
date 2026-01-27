# Phase 1 v1.1｜Step 1：匯出核心表 DDL（schema-only）

## 目的（為什麼要做）
- 取得「不靠猜」的核心表欄位/FK/必要欄位，才能產出下一步的 **最小 E2E 種子資料**（seed）與 **驗收 verify**。

## 前置條件
- 你已能在 WSL 以 docker exec 連進 `sipaios-postgres`。
- DB 內已有 Phase 1 v1.1 schema。

## 操作步驟（請在 WSL 終端機執行）

### 1) 放檔案到 repo
- 把本套件的檔案放到你的 repo 內對應路徑：
  - `scripts/db/03_export_core_tables_ddl.sh`
  - `docs/db/baselines/PHASE1_STEP1_EXPORT_DDL.md`（本檔）

### 2) 清理先前的空檔（若存在）
- 若 `artifacts/inspects/phase1_v1.1/core_tables_ddl.sql` 是 0 bytes，請先刪掉再重跑。

### 3) 執行匯出腳本
- 執行：`bash scripts/db/03_export_core_tables_ddl.sh`

### 4) PASS 判準（完成的樣子）
- 目錄：`artifacts/inspects/phase1_v1.1/`
- 檔案需存在且 **DDL 檔 > 0 bytes**：
  - `core_tables_ddl.sql`
  - `core_tables_ddl.sql.sha256`
  - `core_tables_ddl.export.log`

## 若失敗（只看 LOG 就能定位）
- 打開：`artifacts/inspects/phase1_v1.1/core_tables_ddl.export.log`
- 常見原因：
  - container 名稱不是 `sipaios-postgres`（請用 `docker ps` 查）
  - DB / user 不一致（腳本預設 `-U sipaios -d sipaios`）
  - 表名不一致（例如表在別的 schema 或命名不同）

## 回報給我（最省 token）
- 貼 2 個輸出即可：
  1) `ls -al artifacts/inspects/phase1_v1.1/`
  2) `tail -n 80 artifacts/inspects/phase1_v1.1/core_tables_ddl.export.log`
