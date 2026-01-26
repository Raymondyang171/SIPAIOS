# Phase 1 Baseline（v1.1）凍結流程（小步驟版）

## 目標
- 讓目前已完成的 Phase 1 schema（含 01~11、99 verify）變成「可回滾、可追溯、可搬遷」的基線。

## Step 1｜確認已通過（你已完成）
- 驗收條件：
  - `20260126_10_phase1_verify_sys.sql` 顯示 `sys_schema_version` 與 `sys_idempotency_keys` 存在
  - `sys_schema_version` 至少 1 筆 baseline 記錄（version=1.1）

## Step 2｜（重大）凍結 Baseline（必做）
- 執行腳本：`scripts/db/01_freeze_phase1_v1_1.sh`
- 操作指令（在 WSL 內執行）：

```bash
chmod +x scripts/db/*.sh
./scripts/db/01_freeze_phase1_v1_1.sh
```
- 預期產物：
  - `artifacts/baselines/phase1_v1.1/<timestamp>/`
    - verify_99.txt / verify_10_sys.txt / verify_11_smoke.txt（若有）
    - pg_dump 檔（custom）與 sha256
    - MANIFEST.md
- PASS 判準：腳本最後顯示 DONE，且目錄下檔案齊全。

## Step 3｜（重要）版本標記（建議做，不算重大施工）
- 建議用 VS Code 的 Source Control 介面：
  - Commit：新增的腳本與 docs（不要把 dump 檔納入版本控制）
  - Tag：`phase1-v1.1-baseline`（或你的命名規範）

## Step 4｜（可跳過）還原演練
- 若你準備要搬遷到遠端伺服器，建議在本機先演練一次（避免到遠端才踩雷）。
- 腳本：`scripts/db/02_restore_phase1_baseline.sh <dumpfile>`
- 操作指令（示意）：

```bash
chmod +x scripts/db/*.sh
./scripts/db/02_restore_phase1_baseline.sh artifacts/baselines/phase1_v1.1/<timestamp>/sipaios_phase1_v1.1_<timestamp>.dump
```
