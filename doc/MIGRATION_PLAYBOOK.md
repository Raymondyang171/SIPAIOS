# SaaS → On-Prem 遷移手冊（Offline Copy）

- 文件等級：執行標準
- 目標：搬遷 SOP 可重複、可驗證、可回滾

---

## 0. 遷移紅線（限制）
- 遷移期間必須阻斷寫入（Read-only / Maintenance）
- 必須產生 manifest（版本、schema_version、checksums、時間戳）
- SaaS 端必須保留 30 天只讀（回滾保險）

---

## 1. Offline Copy（標準流程）
- 進維護（只讀）
- 匯出：DB + Storage + Config + manifest
- 傳輸：加密（由客戶 IT 規範）
- 匯入：On-Prem 還原
- 驗證：/health OK、schema_version OK、抽樣一致性
- 切換：PDA 端點、Web 入口（域名/路由）

---

## 2. 驗收錨點（必測）
- 切換後 24 小時抽樣無缺口
- PDA 報工/掃碼完整跑通
- 匯出與匯入的 checksums 對得上（防止「搬家搬到一半」）
