ROADMAP v0.5 — SIP AIOS 全景實施清單
版本：v0.5 (Post-MO-Logic)

日期：2026-01-29

基準：Project Log Entry [15] (MO Logic & Newman Gate Passed)

狀態總結：

底層 (Infra)：🟢 STABLE。安全閘門 (Entry 14) 與還原機制 (Entry 12) 皆已就緒。

業務 (App)：🟡 SCALING。工單開立 (MO) 已完成，正式進入 ERP 邏輯的最深水區 (Backflush)。

🟥 Track A：SIP AIOS 底層架構 (Infrastructure)
目標：打造「打不掛、可回放、可搬遷、多租戶」的運行環境。

Phase 0: 環境與地基 (Foundation)
[x] INFRA-001: 開發環境標準化

驗收：Docker Compose 啟動 DB/App/Nginx，Port 5432 可連線。

[x] INFRA-002: 文件體系確立 (The Bible)

驗收：00_INDEX.md 與 ARCHITECTURE.md 定義清晰。

Phase 1: 資料完整性與可恢復性 (Data Integrity)
[x] INFRA-003: Database Schema V1.1 (SQL)

驗收：Postgres 執行 V1.1 SQL 無報錯，包含核心業務表。

[x] INFRA-004: 一鍵還原機制 (Restore Baseline) [Critical]

驗收：(Entry 12b) make reset < 5秒，資料庫回到初始乾淨狀態。

[x] INFRA-005: 基礎種子資料 (Seed Data)

驗收：重置後，Admin User 與 Tenant 資料存在。

Phase 2: 多租戶與安全性 (Multi-Tenancy & Security)
[x] INFRA-006: 租戶隔離 (Tenant Isolation)

驗收：sys_tenants + Composite FK 強制約束生效。

[x] INFRA-007: 混合部署模型 (Hybrid Model)

驗收：SaaS/On-Prem 共用同一套 Schema。

[x] INFRA-010: 安全閘門與漏洞管理 (Security Gate)

驗收：(Entry 14) make audit-api 產出報告。Policy 定義為：Critical/High 需處理。bcrypt 已升級至 6.0.0。

[ ] INFRA-008: 可觀測性堆疊 (Observability)

內容：部署 Loki (Logs) + Prometheus (Metrics)。

[ ] INFRA-009: 離線遷移工具 (Offline Copy)

內容：export-tenant.sh (SaaS -> On-Prem)。

🟦 Track B：ERP 業務應用 (Business & UI)
目標：實現《系統計劃書 V1.1》商業邏輯。命名規範：嚴格使用 MO (Manufacturing Order)。

Phase 1: 後端骨架與權限 (Backend Core)
[x] APP-001: API Server 初始化

驗收：Express/NestJS 結構確立，/health OK。

[x] APP-002: 身分驗證 (Auth & JWT)

驗收：(Entry 11) /login 取得 Token，Tenant Context 切換成功。

Phase 2: 採購與庫存閉環 (Purchase Domain)
[x] APP-003: 採購流程 API (Purchase Loop)

驗收：(Entry 12b) Newman 測試 14/14 PASS (PO -> Approve -> GRN)。

[x] APP-004: 庫存連動邏輯 (Inventory Effect)

驗收：(Entry 12b) GRN 收貨後，庫存數字準確增加。

[ ] APP-005: 採購前端畫面 (Purchase UI)

內容：PO 列表、收貨掃碼介面。

Phase 3: 生產與製造閉環 (Production Domain)
⚠️ 當前戰略焦點 (Current Strategic Focus)

[x] APP-006-A: 基礎工單 API (Basic CRUD)

驗收：(Entry 12) POST /work-orders 與 GET 基本存取功能完成。

[x] APP-006-B: MO 核心邏輯 (BOM Logic)

驗收：(Entry 15) 驗證 POST /mo 必須鎖定 bom_version_id。Newman 003_production_mo 測試通過。

[ ] APP-007: 倒扣料與報工 API (Backflush) [Hard] [Next SVC]

內容：

POST /production-reports: 完工申報。

Logic: FIFO 扣除原料庫存 (KeyMaterial 追 Lot) -> 增加成品庫存。

Governance: 必須新增 004_backflush.json Newman 測試。

驗收：原料庫存減少、成品庫存增加、批號追溯鏈 (Traceability Chain) 完整。

[ ] APP-008: 生產前端畫面 (Production UI)

內容：現場報工介面 (Mobile)、工單管理後台。

Phase 4: 平台基礎 UI (Platform UI)
[ ] APP-009: 前端專案架構

內容：React/Next.js 初始化。

[ ] APP-010: 登入與導航 (Shell)

內容：Login Page, Sidebar。