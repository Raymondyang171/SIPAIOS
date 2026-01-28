# SIP AIOS Project Log & Status

> **STATUS DASHBOARD (2026-01-28)**
> * **Current Stage**: Pilot (Phase 2)
> * **Latest Action**: [Entry 10] Stage 2C-2 Tenant Closure Wave1 Replay PASS.
> * **Current Blocker**: [Entry 9] Stage 2A Restore Baseline fails on dependency drops.
> * **Immediate Next**: Submit Wave 1 artifacts & Fix Restore script.

---

## I. Active Context (Latest 3 Entries)

### [10] Phase2C Replay Fix: SVC-2C-2A Tenant Closure Wave1
* **Date**: 2026-01-28 | **Phase**: P2 (Pilot) | **Status**: Done
* **Context**: Composite FK enforcement + Verify Schema-Probed fix.
* **Tags**: tenant-closure, hybrid, company-scope, composite-fk, verify, replay

1. **結論 (Conclusions)**
   * Stage2C-2 replay **PASS** (exit_code=0)，產出 artifacts (含 04_summary.txt)。
   * DB 層落地 3 個核心強制約束：`companies.id -> sys_tenants.id`、`inventory_move_lines` & `shipment_lines` (Composite FK)。
   * Verify 腳本改為 **schema-probed**，shipments 空表時採 **WARN + skip**。

2. **邊界取捨 (Trade-offs)**
   * **Hybrid**: Wave1 只對核心高頻明細做 Strict Composite FK。
   * **Values**: `sys_tenants.slug` 強制對齊 `lower(companies.code)`。
   * **Phantom**: Wave1 允許 Phantom tenant 但 Verify 報 WARN。
   * **Test**: 若 `shipments` 空表，Wave1 不硬塞假資料，採 WARN 跳過。

3. **未決事項 (Pending)**
   * Wave2: Phantom tenants 清理與搬移策略。
   * Shipment 行為測試是否升級為 schema-probed seed。
   * Repo 交付物收斂策略 (.gitignore, artifacts)。

4. **下一步 (Next Steps)**
   * 提交 Wave1 交付物：`50_stage2c_tenant_closure_wave1.sql` + `03_replay_...sh`。
   * 落地 `.gitignore` 排除本機備份噪音 (`.bak.*`)。

5. **驗收錨點 (Anchors)**
   * `03_replay...sh` → `stage2c_2=PASS` & `exit_code=0`.
   * DB Constraints exists: `companies_id_fkey_sys_tenants`, `inventory_move_lines...`, `shipment_lines...`.
   * Verify log: Core PASS + `bootstrap_missing_shipment_lines` WARN.

6. **風險與變更 (Risks & Logs)**
   * **Risk**: Verify schema 假設破裂 → **Def**: 全面採 schema-probed。
   * **Change**: `sys_tenants.slug` NOT NULL & aligned; Verify FK schema-agnostic; Shipment test downgrade to WARN on empty.

---

### [09] Phase 2B & 2C: Replay Failure (Restore Baseline Blocked)
* **Date**: 2026-01-28 | **Phase**: P2 (Pilot) | **Status**: **BLOCKED**
* **Context**: Stage2C-1 SQL valid, but Stage 2A restore fails due to dependencies.
* **Tags**: stage2c, company_scope, replay, pg_restore, baseline

1. **結論**
   * **Root Cause**: Stage 2C-1 SQL 無誤，但 **Stage 2A `restore baseline` 失敗**。`pg_restore` 嘗試 Drop `public.companies` 時被 `uoms_company_id_fkey` 阻擋。
   * **Status**: DB 可能已手動套用成功，但「一鍵重播」鏈路斷裂。

2. **邊界取捨**
   * **Tenant**: Company = Tenant (1:1)。
   * **Isolation**: 所有表皆需 Company 隔離；跨 Company 存取拒絕（超管除外）。

3. **未決事項**
   * Restore 策略：Drop schema cascade 或 Pre-clean FK。
   * Wrapper 可觀測性：Log 吞噬問題。

4. **下一步**
   * **(A) Critical**: 修復 `scripts/db/08_restore_latest_phase1_baseline.sh` (Handle dependency errors)。
   * **(B)**: 修復 Wrapper Log 輸出。
   * **(C)**: 端到端重播 `00 -> 01 -> 02` PASS。

5. **驗收錨點**
   * Stage2A: `00_replay...` produces `verify_phase1=PASS`.
   * Stage2B: `01_replay...` exit_code=0.
   * Stage2C: `02_replay...` exit_code=0 & `stage2c_1=PASS`.

6. **風險與變更**
   * **Risk**: Restore 對 dump 後新增物件缺乏清理能力。
   * **Change**: Stage2B baseline submitted; Stage2C-0 tenant scan done; Stage2C-1 manual apply OK.

---

### [08] Roadmap Definition (Reverse from Go-Live)
* **Date**: 2026-01-28 | **Phase**: Demo | **Status**: Done
* **Context**: Redefining roadmap strategy & log format.

1. **結論**: Roadmap 改以 **Demo → Pilot → Go-Live** 反推。`PROJECT_LOG.md` 為專案唯一事實 (SoT)。對話 Title 採人工指定。
2. **邊界**: 不把全文當資料庫，只固化六段式摘要。Phase 定義對齊 P1/P2/P3。
3. **未決**: 歷史摘要是否完整回填。
4. **下一步**: 確認本次 Title。重寫 Roadmap 文件。補齊歷史摘要。
5. **驗收**: 新 Roadmap 格式統一。Log 最新一筆可判讀狀態。
6. **變更**: 確立 Roadmap 重寫口徑。

---

## II. Archived Logs (Condensed History)

**[07] Phase 1 v1.1 One-Click Replay & Runbook (2026-01-27)**
* **Status**: Done (Stage 2A) | **Tags**: stage2a, replay, hygiene
* **結論**: Phase 1 v1.1 具備一鍵重播 (Restore->Seed->Verify)。Docs 收斂至 `doc/`，Runbook 至 `doc/runbooks/`。Repo 清理完成。
* **決策**: 選擇 Fast Lane (小改)。Verify 檔名採日期前綴。Core tables count 採排除規則。
* **下一步**: 啟動 Stage 2B。決定 2B 租戶邊界 (Org vs Company)。
* **驗收**: `00_replay_phase1_v1_1.sh` 輸出固定摘要且 PASS。Git status clean.

**[06] Phase 1 Workflow Extension (2026-01-28)**
* **Status**: Done | **Tags**: phase1_v1.1, ops_sql, generator_fix
* **結論**: 本機 Postgres 跑通 Sys表 + Seed + Verify。建立可回滾 Baseline Dump。Generator 修正。
* **決策**: 修 Generator 而非手改 Seed。`artifacts/` 不進版控。
* **下一步**: 啟動 Stage 2A。乾淨環境演練。
* **驗收**: `08_restore...sh` tables=37. Seed COMMIT success. Git hygiene check pass.

**[05] Stage 0 Local Env Setup (2026-01-26)**
* **Status**: In Progress | **Tags**: stage0, wsl2, docker, schema-v1.1
* **結論**: WSL2+Docker (Port 55432) 啟動成功。Phase 1 Schema (01-05) 灌入完成。
* **決策**: 本機完整 Stack。DB Forward-only。Claude 分支暫不合併。
* **下一步**: 執行 Schema 06/07/99 Verify。補全 Runbook。
* **驗收**: Docker healthy. `select 1` OK. `psql \dt` shows tables.

**[04] Production Logic & Phase 1 Schema Delivery (2026-01-28)**
* **Status**: Done | **Tags**: v1.1, backflush, bom_version, void_wo
* **結論**: V1.1 規則鎖死 (Backflush/FIFO/KeyMaterial/Void/ExternalRef)。Schema SQL (Zip) 交付。
* **決策**: Backflush 預設。BOM 只增不刪。Void 走退庫。Integration 強制 External Ref。
* **下一步**: 執行 SQL 01-07 & 99 Verify。更新 `db_schema.txt`。
* **驗收**: `99_phase1_verify.sql` PASS. 關鍵表與型別存在。

**[03] Documentation Strategy & Assessment (2026-01-28)**
* **Status**: Done | **Tags**: docs, v2.1, integration, api
* **結論**: 關鍵文件 (Integration/Retention/DR/API/Sizing) 必備。採模組化 + Index 導覽，不合併巨型檔。
* **決策**: 保留模組化 .md。使用 `00_INDEX.md` 做聚合視圖。
* **下一步**: 建立 Customer/Operator/Developer 三條導覽路徑。
* **驗收**: `00_INDEX.md` 可在 30 秒內導航至關鍵資訊。

**[02] Phase 0 Data Contract & Skeleton (2026-01-28)**
* **Status**: Done | **Tags**: phase0, gate-review, schema
* **結論**: Phase 0 重點在 DB Schema / Data Contract 骨架可驗收。
* **決策**: 只做骨架 (Outbox/Webhook/Audit)。效能採 Trigger-based。Offline-first 最小閉環。
* **下一步**: 定義 3 條核心流程 + 核心欄位字典。產出 10-15 張核心表骨架。Gate Review。
* **驗收**: Canonical Data Dictionary & Core Schema Skeleton 交付。

**[01] SIP AIOS Documentation Baseline (2026-01-28)**
* **Status**: Done | **Tags**: docs, v2.1, gate
* **結論**: README/CONTEXT/AGENTS 以 v2.1 基線重寫。確立 Gate 條款。
* **決策**: 文件採「應具備 vs 現況」口徑。
* **下一步**: SVC-001 (Overwrite docs), SVC-002 (Inventory check), SVC-003 (Evidence fill).
* **驗收**: Repo 內三檔更新。CONTEXT 包含證據連結。