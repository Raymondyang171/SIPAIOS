# SIP AIOS Project Log & Status

> **STATUS DASHBOARD (2026-01-29)**
> * **Current Stage**: Pilot (Phase 2)
> * **Latest Action**: [Entry 15] SVC-APP-006-B MO Logic Verified & [Entry 14] Security Hardened.
> * **Current Blocker**: None.
> * **Immediate Next**: Start SVC-APP-007 (Backflush Logic & Algorithm).

---

## I. Project Log Entries (Full History)

### [15] SVC-APP-006-B Production MO Logic & Newman Gate
* **Date**: 2026-01-29 | **Phase**: P2 (Pilot) | **Status**: Done
* **Context**: Enforcing BOM Version Lock via Seed/Test evidence, closing APP-03 coverage.
* **Tags**: mo-logic, bom-lock, newman, seed, gate

1. **結論 (Conclusions)**
   * **MO 閉環驗收**: `SVC-APP-006-B` 完成。新增 `003_production_mo` seed 與測試集。
   * **Gate 通過**: `scripts/gate_app02.sh` 全流程 PASS (含 DB Replay + Seed 001/002/003 + Newman)。
   * **BOM Lock**: 驗證 `POST /mo` 必須帶 `bom_version_id`，且跨租戶引用會回傳 403。

2. **邊界取捨 (Trade-offs)**
   * **Impl**: 不修改 Handler 程式碼（既有邏輯已存在），改以「Seed + Newman Negative Test」作為行為的唯一驗收標準。
   * **Scope**: 測試目前掛載於 `gate_app02.sh` (APP-02 Gate)，暫不拆分獨立腳本。
   * **Validation**: 不做 UI，以 API Response 的證據鏈 (MO -> BOM Ver) 為準。

3. **下一步**
   * **SVC-APP-007**: 啟動 Backflush (倒扣料) 演算法實作。

---

### [14] SVC-W4 Security Hardening: Audit Policy & Patching
* **Date**: 2026-01-29 | **Phase**: P2 (Pilot) | **Status**: Done
* **Context**: `npm audit` infrastructure, Policy definition, and critical patching.
* **Tags**: security, audit, bcrypt, waiver, gate-policy

1. **結論**
   * **Tools**: `make audit-api` 可產出標準化 JSON 報告。
   * **Policy**: Pilot Gate 策略定案 (Critical=BLOCK, High=WARN)。
   * **Patch**: `bcrypt` 升級至 6.0.0 (移除 node-pre-gyp 依賴鏈)，High 漏洞減少。

2. **邊界取捨**
   * **Waiver**: 針對 `newman` 的漏洞採「風險接受 + 留痕」策略，不執行 `npm audit fix --force`。
   * **Scope**: 區分 `dev-only` (Allow/Warn) vs `prod-scope` (Block) 依賴。

---

### [13] SVC-W3-1 Gate Portability (Newman Localized)
* **Date**: 2026-01-29 | **Phase**: P2 (Pilot) | **Status**: Done
* **Context**: Localizing `newman` dependency to ensure consistent CI/CD execution.
* **Tags**: gate, newman, portability, makefile

1. **結論**
   * `newman` 改為專案級依賴 (`devDependencies`)，不再依賴全域安裝。
   * Gate 腳本更新為 `npm --prefix apps/api run test:newman`。

2. **邊界取捨**
   * **Isolation**: 確保在無 Global Package 的 CI 環境下，`npm ci` 後即可跑通 Gate。

---

### [12] SVC-APP-02 Purchase Loop (PO → GRN) & Infra Gate
* **Date**: 2026-01-29 | **Phase**: P2 (Pilot) | **Status**: Done
* **Context**: Purchase Loop API implementation, Newman verification, DB Replay Chain validation.
* **Tags**: newman-gate, seed, postman, release, v0.1.0

1. **結論**
   * **APP-02 閉環跑通**: Newman 測試 (14 requests) 全部 PASS (0 failed).
   * **Infra 鏈路修復**: 驗證了 `restore phase1 baseline` → `apply RBAC/RLS` → `seed` 的完整重播鏈路成功。
   * **版本固化**: Tag `app-02-purchase-loop-v0.1.0` 已推送。

2. **邊界取捨**
   * **Scope**: 嚴守邊界，僅修復 Seed UUID 與 Env 對齊，不提前實作深層會計邏輯。
   * **Gate**: 以 Newman 作為唯一驗收標準 (Gatekeeper)。

---

### [11] APP-01 Auth Skeleton & Milestone Archive
* **Date**: 2026-01-28 | **Phase**: P2 (Pilot) | **Status**: Done
* **Context**: Express API init, JWT Auth, Tenant Switching, Postman Verification.
* **Tags**: app-01, auth, jwt, switch-company, seed

1. **結論**
   * APP-01 API Server 本機啟動成功。
   * **驗收通過**: `/health`, `/login`, `/switch-company` 經 Postman/Newman 測試 0 failures。
   * **Seed 更新**: 建立測試 User/Memberships，補強 `password_hash`。

2. **邊界取捨**
   * **Scope**: 僅做 Access Token (JWT) + 租戶切換；不做 Refresh Token / RBAC UI。
   * **Deps**: 允許 `apps/api` 使用 npm (與主 repo pnpm 並存)。

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

---

### [09] Phase 2B & 2C: Replay Failure (Resolved)
* **Date**: 2026-01-28 | **Phase**: P2 (Pilot) | **Status**: **Resolved**
* **Context**: Stage 2A restore failed due to dependencies. (Fixed in Entry 12).
* **Tags**: stage2c, replay, pg_restore, blocker

1. **結論**
   * **問題**: `pg_restore` 嘗試 Drop `public.companies` 時被 `uoms_company_id_fkey` 依賴阻擋。
   * **解決**: 在 Entry 12 (APP-02) 實作過程中，透過完整的 Replay Chain 修正與驗證，確認問題已排除。

2. **邊界取捨**
   * **Isolation**: 所有表（含 Master Data）皆需 Company 隔離。

---

### [08] Roadmap Definition (Reverse from Go-Live)
* **Date**: 2026-01-28 | **Phase**: Demo | **Status**: Done
* **Context**: Redefining roadmap strategy & log format.

1. **結論**
   * Roadmap 改以 **Demo → Pilot → Go-Live** 反推。
   * **PROJECT_LOG.md** 為專案唯一事實 (SoT)。

2. **邊界取捨**
   * Phase 定義對齊：P1=Demo, P2=Pilot, P3=Go-Live, P4=Ops。

---

### [07] Phase 1 v1.1 One-Click Replay & Runbook
* **Date**: 2026-01-27 | **Phase**: P2 (Stage 2A) | **Status**: Done
* **Context**: Establishing baseline restoration and verification scripts.
* **Tags**: stage2a, replay, hygiene

1. **結論**
   * 建立 `00_replay_phase1_v1_1.sh`，驗收 Phase 1 基線 (Tables=37, Seed=OK)。
   * 文件收斂至 `doc/`，Runbook 收斂至 `doc/runbooks/`。Repo 清理完成。

2. **邊界取捨**
   * **Fast Lane**: 選擇小改版以快速推進。
   * **Verify**: 檔名採日期前綴，Core tables count 採排除規則。

---

### [06] Phase 1 Workflow Extension
* **Date**: 2026-01-28 | **Phase**: P1 (Demo) | **Status**: Done
* **Context**: Local environment setup and generator fixes.
* **Tags**: phase1_v1.1, ops_sql, generator_fix

1. **結論**
   * 本機 Postgres 跑通 Sys表 + Seed + Verify。建立可回滾 Baseline Dump。
   * 修正 Generator 避免 `qty=0` 錯誤。

2. **邊界取捨**
   * **Fix Strategy**: 修 Generator 而非手改 Seed。
   * **Artifacts**: `artifacts/` 目錄不進版控。

---

### [05] Stage 0 Local Env Setup
* **Date**: 2026-01-26 | **Phase**: P0 (Init) | **Status**: Done
* **Context**: Infrastructure setup (WSL2 + Docker).
* **Tags**: stage0, wsl2, docker

1. **結論**
   * WSL2 + Docker Desktop (Port 55432) 啟動成功。
   * Phase 1 Schema (01-05) 灌入完成。

2. **邊界取捨**
   * **Stack**: 本機完整 Stack。
   * **DB**: 採 Forward-only 策略。

---

### [04] Production Logic & Phase 1 Schema Delivery
* **Date**: 2026-01-28 | **Phase**: P1 (Demo) | **Status**: Done
* **Context**: Defining core business rules for manufacturing.
* **Tags**: v1.1, backflush, bom_version, void_wo

1. **結論**
   * **Backflush**: 預設開啟，僅 KeyMaterial 追 Lot (FIFO)。
   * **BOM**: 只增不刪，工單鎖 VersionID。
   * **Void**: 作廢工單必須退庫歸帳。
   * **Integration**: 強制 External Reference (對帳鍵)。

---

### [03] Documentation Strategy & Assessment
* **Date**: 2026-01-28 | **Phase**: P1 (Demo) | **Status**: Done
* **Context**: Restructuring documentation for clarity.
* **Tags**: docs, v2.1, integration, api

1. **結論**
   * 關鍵文件 (Integration/Retention/DR/API/Sizing) 必備。
   * 採模組化 + Index 導覽 (Customer/Operator/Developer)。

2. **邊界取捨**
   * 保留模組化 .md，不合併為巨型文檔。
   * 使用 `00_INDEX.md` 做聚合視圖。

---

### [02] Phase 0 Data Contract & Skeleton
* **Date**: 2026-01-28 | **Phase**: P0 (Init) | **Status**: Done
* **Context**: Defining the initial schema skeleton.
* **Tags**: phase0, gate-review, schema

1. **結論**
   * Phase 0 重點在 DB Schema / Data Contract 骨架可驗收。
   * 只做骨架 (Outbox/Webhook/Audit)。

2. **邊界取捨**
   * 效能採 Trigger-based。
   * Offline-first 最小閉環。

---

### [01] SIP AIOS Documentation Baseline
* **Date**: 2026-01-28 | **Phase**: P0 (Init) | **Status**: Done
* **Context**: Initial baseline check and rewrite.
* **Tags**: docs, v2.1, gate

1. **結論**
   * README/CONTEXT/AGENTS 更新至 v2.1 標準。
   * 確立 Delivery/Ops Gate 條款。

2. **邊界取捨**
   * 文件採「應具備 vs 現況」口徑。