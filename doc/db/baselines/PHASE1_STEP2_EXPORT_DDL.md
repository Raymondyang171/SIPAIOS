# Phase 1 v1.1｜Step2 匯出 DDL（證據先行）

## 目標
- 產出「可驗證、可重現」的 DDL 檔，讓後續最小 E2E 種子資料（12/13）不靠猜欄位。

## 你要做的事（WSL）
1) 把本 bundle 內的腳本放回 repo：
- `scripts/db/04_export_phase1_ddls.sh`

2) 在 repo root 執行該腳本。

## PASS 判準
目錄 `artifacts/inspects/phase1_v1.1/` 內至少要有：
- `public_schema_ddl.sql`（非 0 bytes）
- `public_schema_ddl.export.log`
- `public_schema_ddl.sql.sha256`

`core_tables_ddl.sql` 若仍為 0 bytes 沒關係，它只是加速用的子集合；以 `public_schema_ddl.sql` 為準。

## 回報給 ChatGPT（最省 token）
請貼兩段輸出：
- `ls -al artifacts/inspects/phase1_v1.1/`
- `tail -n 120 artifacts/inspects/phase1_v1.1/public_schema_ddl.export.log`
