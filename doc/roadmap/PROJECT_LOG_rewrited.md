# SIP AIOS Project Log & Status

> **STATUS DASHBOARD (2026-01-29)**
> * **Current Stage**: Pilot (Phase 2)
> * **Latest Action**: [Entry 12] SVC-APP-02 Purchase Loop (PO→GRN) Newman PASS.
> * **Current Blocker**: None. (Infra Restore Chain verified in Entry 12).
> * **Immediate Next**: Switch GitHub default branch to `main` & Merge Stage 2C.

---

## I. Active Context (Latest 3 Entries)

### [12] SVC-APP-02 Purchase Loop (PO → GRN) & Infra Gate
* **Date**: 2026-01-29 | **Phase**: P2 (Pilot) | **Status**: Done
* **Context**: Purchase Loop API implementation, Newman verification, DB Replay Chain validation.
* **Tags**: newman-gate, seed, postman, rbac, release, v0.1.0

1. **結論 (Conclusions)**
   * **APP-02 閉環跑通**: Newman 測試 (14 requests) 全部 PASS (0 failed).
   * **Infra 鏈路修復**: 驗證了 `restore phase1 baseline` → `apply RBAC/RLS` → `seed(001/002)` 的完整重播鏈路成功。
   * **版本固化**: Commit + Tag `app-02-purchase-loop-v0.1.0` 已推送。

2. **邊界取捨 (Trade-offs)**
   * **Scope**: 嚴守邊界，僅修復 Seed UUID 與 Env 對齊，不提前實作深層會計邏輯。
   * **Gate**: 以 Newman 作為唯一驗收標準 (Gatekeeper)，拒絕口頭驗收。
   * **Git**: Tag 驗收採 detached HEAD 策略，確保里程碑是不可變的快照。

3. **未決事項 (Pending)**
   * GitHub `default branch` 仍指向開發分支 `claude/...`，需切回 `main`。
   * `svc/stage2c-company-scope` 分支尚未合併回主線。

4. **下一步 (Next Steps)**
   * **Governance**: GitHub Settings 將預設分支改為 `main`。
   * **Merge**: 開 PR 將 `svc/stage2c-company-scope` 合併入 `main`。
   * **Ops**: 補齊標準重播 Runbook (一鍵 Restore -> Newman)。

5. **驗收錨點 (Anchors)**
   * Newman Report: `failed 0`.
   * DB State: Seed 002 committed successfully.
   * Git: Remote tag `app-02-purchase-loop-v0.1.0` exists.

6. **風險與變更 (Risks & Logs)**
   * **Risk**: Postman Env 與 Seed UUID 不一致 → **Def**: 固定 UUID + 自動化 Gate 必跑。
   * **Risk**: `inventory_balances` 欄位漂移 → **Def**: 以 DB Schema 為單一事實。

---

### [11] APP-01 Auth Skeleton & Milestone Archive
* **Date**: 2026-01-28 | **Phase**: P2 (Pilot) | **Status**: Done
* **Context**: Express API init, JWT Auth, Tenant Switching, Postman Verification.
* **Tags**: app-01, auth, jwt, switch-company, postman, seed

1. **結論**
   * APP-01 API Server 本機啟動成功。`/health`, `/login`, `/switch-company` Newman 0 failures。
   * Seed 更新：建立測試 User/Memberships，補強 `password_hash`。

2. **邊界取捨**
   * **Scope**: 僅做 Access Token (JWT) + 租戶切換；不做 Refresh Token / RBAC UI。
   * **Validation**: 以 Postman/Newman 為唯一權威。
   * **Deps**: 允許 `apps/api` 使用 npm。

3. **未決事項**
   * `npm audit` 漏洞處理。

4. **下一步**
   * **Archive**: `git add` → commit → tag.
   * **Regression**: 重跑 `seed → start → newman`。

5. **驗收錨點**
   * `npm run seed` Success. `curl /health` OK. Newman 0 failed.

6. **風險與變更**
   * **Change**: 新增 `apps/api` 骨架、Seed 更新、Postman Collection。

---

### [10] Phase2C Replay Fix: Tenant Closure Wave1
* **Date**: 2026-01-28 | **Phase**: P2 (Pilot) | **Status**: Done
* **Context**: Composite FK enforcement + Verify Schema-Probed fix.
* **Tags**: tenant-closure, hybrid, composite-fk, verify

1. **結論**
   * Stage2C-2 replay **PASS**。
   * DB 落地核心約束：`companies.id -> sys_tenants.id`、`inventory/shipment` Composite FK。
   * Verify 改為 **schema-probed**，shipments 空表時採 **WARN + skip**。

2. **邊界取捨**
   * **Hybrid**: Wave1 只對核心高頻明細做 Strict Composite FK。
   * **Values**: `sys_tenants.slug` 強制對齊 `lower(companies.code)`。

3. **未決事項**
   * Wave2: Phantom tenants 清理策略。

4. **下一步**
   * 提交 Wave1 交付物。落地 `.gitignore`。

5. **驗收錨點**
   * `03_replay...sh` PASS. DB Constraints exist. Verify log: Core PASS.

6. **風險與變更**
   * **Change**: `sys_tenants.slug` aligned; Verify FK schema-agnostic.

---

## II. Archived Logs (Condensed History)

**[09] Phase 2B & 2C: Replay Failure (Restore Baseline) (2026-01-28)**
* **Status**: **Resolved** (See Entry 12) | **Tags**: blocker, restore
* **紀錄**: 當時 `restore baseline` 因 FK 依賴失敗。**更新**: Entry 12 確認 APP-02 流程中已成功執行 Restore → Seed 鏈路，此阻塞點已解除。

**[08] Roadmap Definition (Reverse from Go-Live) (2026-01-28)**
* **Status**: Done | **Tags**: roadmap, process
* **結論**: Roadmap 改以 Demo → Pilot → Go-Live 反推。`PROJECT_LOG.md` 為專案唯一事實 (SoT)。

**[07] Phase 1 v1.1 One-Click Replay & Runbook (2026-01-27)**
* **Status**: Done (Stage 2A) | **Tags**: stage2a, replay
* **結論**: Phase 1 v1.1 具備一鍵重播。Docs 收斂至 `doc/`。

**[06] Phase 1 Workflow Extension (2026-01-28)**
* **Status**: Done | **Tags**: phase1_v1.1, generator_fix
* **結論**: 本機 Postgres 跑通 Sys表 + Seed + Verify。建立可回滾 Baseline Dump。

**[05] Stage 0 Local Env Setup (2026-01-26)**
* **Status**: In Progress | **Tags**: stage0, wsl2, docker
* **結論**: WSL2+Docker 啟動成功。Phase 1 Schema (01-05) 灌入完成。

**[04] Production Logic & Phase 1 Schema Delivery (2026-01-28)**
* **Status**: Done | **Tags**: v1.1, backflush, void_wo
* **結論**: V1.1 規則鎖死 (Backflush/FIFO/KeyMaterial/Void)。Schema SQL 交付。

**[03] Documentation Strategy & Assessment (2026-01-28)**
* **Status**: Done | **Tags**: docs, index
* **結論**: 採模組化 + Index 導覽。建立 Customer/Operator/Developer 路徑。

**[02] Phase 0 Data Contract & Skeleton (2026-01-28)**
* **Status**: Done | **Tags**: phase0, schema
* **結論**: Phase 0 重點在 DB Schema / Data Contract 骨架可驗收。

**[01] SIP AIOS Documentation Baseline (2026-01-28)**
* **Status**: Done | **Tags**: docs, v2.1
* **結論**: README/CONTEXT/AGENTS 以 v2.1 基線重寫。確立 Gate 條款。