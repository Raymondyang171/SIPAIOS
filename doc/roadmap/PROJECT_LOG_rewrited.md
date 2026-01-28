# SIP AIOS Project Log & Status

> **STATUS DASHBOARD (2026-01-28)**
> * **Current Stage**: Pilot (Phase 2)
> * **Latest Action**: [Entry 11] APP-01 Auth Skeleton **Archived** (tag=app-01-auth-skeleton-v0.1.0).
> * **Current Blocker**: [Entry 9] Stage 2A Restore Baseline fails (Infra/Track A).
> * **Immediate Next**: Fix DB Restore Script (SVC-INFRA-01-RESTORE).

---

## I. Active Context (Latest 3 Entries)

### [11] APP-01 Auth Skeleton & Milestone Archive
* **Date**: 2026-01-28 | **Phase**: P2 (Pilot) | **Status**: **Archived** (tag=`app-01-auth-skeleton-v0.1.0`)
* **Context**: Express API init, JWT Auth, Tenant Switching, Postman Verification.
* **Tags**: app-01, auth, jwt, switch-company, postman, seed, replay-gate, archived

1. **結論 (Conclusions)**
   * APP-01 API Server (Express) 本機啟動成功。
   * **驗收通過**: `/health`, `/login`, `/switch-company` 經 Postman/Newman 測試 0 failures。
   * **Seed 更新**: 建立測試 User/Memberships，補強 `password_hash`。
   * **Root Cause**: 手動驗證失敗主因是打錯 Port (正確: 3001, Hello容器: 3000)。
   * **已完成封存** (2026-01-28): Newman 回歸 0 failures → commit → tag `app-01-auth-skeleton-v0.1.0` → push。

2. **邊界取捨 (Trade-offs)**
   * **Scope**: 僅做 Access Token (JWT) + 租戶切換；不做 Refresh Token / RBAC UI。
   * **Validation**: 以 Postman/Newman 自動化測試為唯一權威，手動 curl 僅輔助。
   * **Deps**: 允許 `apps/api` 使用 npm (與主 repo pnpm 並存)，以 `.env.example` 確保可重現。

3. **未決事項 (Pending)**
   * `npm audit` 顯示漏洞，需分類處理。
   * `PROJECT_LOG.md` 狀態需同步 (已於本次更新)。

4. **下一步 (Next Steps)**
   * **Archive**: `git add` (apps/api + runbook) → commit → tag.
   * **Regression**: 重跑 `seed → start → newman` 確保歸檔後綠燈。
   * **Fix**: 處理 `npm audit` (非強制)。

5. **驗收錨點 (Anchors)**
   * `npm run seed` 顯示 `✅ Seed complete!`。
   * `curl localhost:3001/health` 回傳 `{"status":"ok"}`。
   * Newman Report: 9 reqs / 22 assertions / 0 failed.

6. **風險與變更 (Risks & Logs)**
   * **Risk**: npm/pnpm 混用導致依賴漂移 → **Def**: 鎖定 lockfile + runbook。
   * **Change**: 新增 `apps/api` 骨架、Seed 更新、Postman Collection、Runbook。

---

### [10] Phase2C Replay Fix: Tenant Closure Wave1
* **Date**: 2026-01-28 | **Phase**: P2 (Pilot) | **Status**: Done
* **Context**: Composite FK enforcement + Verify Schema-Probed fix.
* **Tags**: tenant-closure, hybrid, composite-fk, verify, replay

1. **結論**
   * Stage2C-2 replay **PASS** (exit_code=0)。
   * DB 落地核心約束：`companies.id -> sys_tenants.id`、`inventory/shipment` Composite FK。
   * Verify 改為 **schema-probed**，shipments 空表時採 **WARN + skip**。

2. **邊界取捨**
   * **Hybrid**: Wave1 只對核心高頻明細做 Strict Composite FK。
   * **Values**: `sys_tenants.slug` 強制對齊 `lower(companies.code)`。
   * **Phantom**: Wave1 允許 Phantom tenant 但 Verify 報 WARN。

3. **未決事項**
   * Wave2: Phantom tenants 清理策略。
   * Shipment 行為測試是否升級為 schema-probed seed。

4. **下一步**
   * 提交 Wave1 交付物：`50_stage2c_tenant_closure_wave1.sql`。
   * 落地 `.gitignore` 排除本機備份噪音。

5. **驗收錨點**
   * `03_replay...sh` → `stage2c_2=PASS`.
   * DB Constraints exists. Verify log: Core PASS.

6. **風險與變更**
   * **Change**: `sys_tenants.slug` aligned; Verify FK schema-agnostic; Shipment test WARN on empty.

---

### [09] Phase 2B & 2C: Replay Failure (Restore Baseline Blocked)
* **Date**: 2026-01-28 | **Phase**: P2 (Pilot) | **Status**: **BLOCKED**
* **Context**: Stage 2A restore fails due to dependencies (Track A).
* **Tags**: stage2c, replay, pg_restore, baseline, blocker

1. **結論**
   * **Root Cause**: Stage 2C-1 SQL 無誤，但 **Stage 2A `restore baseline` 失敗**。`pg_restore` Drop `public.companies` 時被 `uoms_company_id_fkey` 阻擋。
   * **Status**: 一鍵重播鏈路斷裂。

2. **邊界取捨**
   * **Isolation**: 所有表皆需 Company 隔離；跨 Company 存取拒絕。

3. **未決事項**
   * Restore 策略：Drop schema cascade 或 Pre-clean FK。

4. **下一步 (Critical Path)**
   * **Fix Restore**: 修復 `scripts/db/08_restore_latest_phase1_baseline.sh`。
   * **Fix Wrapper**: 改善 Log 輸出。

5. **驗收錨點**
   * Stage2A: `00_replay...` produces `verify_phase1=PASS`.

6. **風險與變更**
   * **Risk**: Restore 對 dump 後新增物件缺乏清理能力。

---

## II. Archived Logs (Condensed History)

**[08] Roadmap Definition (Reverse from Go-Live) (2026-01-28)**
* **Status**: Done | **Tags**: roadmap, process
* **結論**: Roadmap 改以 Demo → Pilot → Go-Live 反推。`PROJECT_LOG.md` 為專案唯一事實 (SoT)。
* **決策**: 不把全文當資料庫，只固化六段式摘要。

**[07] Phase 1 v1.1 One-Click Replay & Runbook (2026-01-27)**
* **Status**: Done (Stage 2A) | **Tags**: stage2a, replay
* **結論**: Phase 1 v1.1 具備一鍵重播。Docs 收斂至 `doc/`。Repo 清理完成。

**[06] Phase 1 Workflow Extension (2026-01-28)**
* **Status**: Done | **Tags**: phase1_v1.1, generator_fix
* **結論**: 本機 Postgres 跑通 Sys表 + Seed + Verify。建立可回滾 Baseline Dump。

**[05] Stage 0 Local Env Setup (2026-01-26)**
* **Status**: In Progress | **Tags**: stage0, wsl2, docker
* **結論**: WSL2+Docker (Port 55432) 啟動成功。Phase 1 Schema (01-05) 灌入完成。

**[04] Production Logic & Phase 1 Schema Delivery (2026-01-28)**
* **Status**: Done | **Tags**: v1.1, backflush, void_wo
* **結論**: V1.1 規則鎖死 (Backflush/FIFO/KeyMaterial/Void)。Schema SQL 交付。

**[03] Documentation Strategy & Assessment (2026-01-28)**
* **Status**: Done | **Tags**: docs, index
* **結論**: 採模組化 + Index 導覽，不合併巨型檔。建立 Customer/Operator/Developer 路徑。

**[02] Phase 0 Data Contract & Skeleton (2026-01-28)**
* **Status**: Done | **Tags**: phase0, schema
* **結論**: Phase 0 重點在 DB Schema / Data Contract 骨架可驗收。

**[01] SIP AIOS Documentation Baseline (2026-01-28)**
* **Status**: Done | **Tags**: docs, v2.1
* **結論**: README/CONTEXT/AGENTS 以 v2.1 基線重寫。確立 Gate 條款。