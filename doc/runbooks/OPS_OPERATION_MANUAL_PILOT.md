# Pilot Ops 操作手冊（可執行流程）

- 文件等級：Runbook（Pilot / Ops）
- 目的：把「啟動 → Gate → 日常維運 → 事故處置 → Retention/DR」串成可執行流程
- 原則：**未有 repo 證據者一律標【待補】**

---

## 1) 系統定位與目前狀態（Pilot Phase 2）

> 使用 Project Log 的最新紀錄為唯一事實來源。

- 目前狀態（Evidence）：
  - **Current Stage**: Demo (Phase 1)
  - **Immediate Next**: Run Seed 004 & Execute Full Demo Walkthrough
  - **來源**: `doc/roadmap/PROJECT_LOG_rewrited.md` 的 STATUS DASHBOARD（2026-01-29）
- **說明**：本節標題要求「Pilot Phase 2」，但現況紀錄顯示 **Demo (Phase 1)**。若已進入 Pilot Phase 2，請更新 Project Log 後再同步本手冊。

**驗收錨點**
- 在 `doc/roadmap/PROJECT_LOG_rewrited.md` 中可找到 **Current Stage** 與 **Immediate Next**（日期 2026-01-29）。

**常見失敗點**
- Project Log 未更新卻在本手冊宣稱已進入 Pilot → **禁止**（請先更新 Log）。

---

## 2) 快速啟動（Dev/Pilot）

### 2.1 Web / API 啟動

- API（Express）：
  - `pnpm --prefix apps/api dev`
  - 預設 port：`3001`（見 `apps/api/src/config.js`）
- Web（Next.js）：
  - `pnpm --prefix apps/web dev`
  - dev port：`3002`（見 `apps/web/package.json`）
- 可選一鍵腳本：
  - `bash scripts/dev/dev_app09.sh start`（啟動 API+Web；端口在腳本內）

### 2.2 /health 驗證

- API health：
  - `curl http://localhost:3001/health`
  - 預期：`{ "status": "ok", "db": "connected" }`（見 `apps/api/src/index.js`）
- Web proxy health：
  - `curl http://localhost:3002/api/health`
  - 預期：轉發至 API health（見 `apps/web/app/api/health/route.ts`）

### 2.3 Gate 執行

- Gate（APP-02）：
  - `bash scripts/gate_app02.sh`
  - 或 `make gate-app-02`
  - Gate PASS 會輸出 `gate_result=PASS`（見 `scripts/gate_app02.sh`）

**驗收錨點**
- `/health` 回傳 `status=ok` 且 `db=connected`
- `scripts/gate_app02.sh` 輸出 `gate_result=PASS`

**常見失敗點**
- 端口衝突（3001/3002）：先用 `bash scripts/dev/dev_app09.sh status` 檢查
- Web dev port 實際為 3002（非 3000）；若用 3000 會誤判未啟動
- DB 未啟動導致 API `/health` 503

---

## 3) 日常維運清單（Daily / Weekly / Monthly）

### 3.1 Daily

- /health（API/Web）
- Disk 水位（DB/Storage/Logs）
- Queue depth【待補】（尚未找到 queue 指標端點/腳本）
- 5xx 錯誤率【待補】（尚未找到統一指標輸出）

**驗收錨點**
- `/health` OK
- Disk 使用率 < 80%

**常見失敗點**
- 只看總磁碟，未拆分 DB/Storage/Logs → 無法定位成長來源

### 3.2 Weekly

- Retention 報告【待補】（未找到報告輸出腳本）
- Top slow queries【待補】（未找到 slow query 報表）

**驗收錨點**
- 具體報告檔或指標輸出（目前未落地 →【待補】）

**常見失敗點**
- 沒有報表卻宣稱已檢查 → 禁止

### 3.3 Monthly

- 權限與高權限帳號檢查【待補】（未找到標準報表）
- Service Account 狀態檢查【待補】

**驗收錨點**
- 有稽核記錄或清單（目前未落地 →【待補】）

**常見失敗點**
- 只口頭確認，無可追溯紀錄

---

## 4) 事故處置 Runbook（P0 / P1 / P2）

> 參考：`doc/OPS_RUNBOOK.md`（SOP-A~K）

### 4.1 分級

- P0：疑似資料外洩、越權、全面不可用
- P1：單客戶不可用、寫入異常、備份失敗、Disk > 90%
- P2：效能退化、看板延遲、報表失敗

### 4.2 Disk > 80%（P1）

- 強制清理（依 `DATA_RETENTION_POLICY.md`）：
  - 暫存 / 報表產物 / Webhook logs（到期者）
  - Emergency Retention（縮短保留）
- 降級：
  - 暫停非必要匯出與報表（P2/P3 任務）
- 驗證與回復：
  - 清出至少 15% 空間後再解除保護模式
  - 記錄清理量與剩餘空間

**驗收錨點**
- Disk 使用率從 >80% 降回安全水位（<80%）
- 有清理記錄（時間/釋放空間/範圍）

**常見失敗點**
- 沒有實際清理動作，只改設定值
- 清理過程誤刪敏感資料（必須遵守 Retention 規範）

---

## 5) 備份 / 還原 / DR 演練

> 參考：`doc/DISASTER_RECOVERY_PLAN.md`

### 5.1 頻率

- Quarterly：還原驗證（測試環境）
- Yearly：全流程 DR（DB + Storage + Config + App/Worker）
- Major Upgrade 前：必做還原驗證

### 5.2 RTO/RPO 記錄格式（最小）

- Target RTO / Actual RTO
- Target RPO / Actual RPO
- 備份 ID / 檔名 / 時間
- 驗證步驟時間戳

**驗收錨點**
- DR 紀錄表有完整欄位且可對應執行步驟

**常見失敗點**
- 只還原 DB，未驗證 Storage/Config
- 未量測 RTO/RPO

---

## 6) DISASTER_RECOVERY_PLAN（關聯入口）

- 參考文件：`doc/DISASTER_RECOVERY_PLAN.md`

**驗收錨點**
- Quarterly / Yearly 演練都有紀錄檔（含 RTO/RPO）

**常見失敗點**
- 只有計畫，沒有實際演練記錄

---

## 7) 安全與變更門檻（Go / No-Go）

- 重大升級前：必做還原驗證（Go/No-Go gate）
- 漏洞政策：
  - 參考：`doc/runbooks/SVC-SECURITY-GATE-POLICY.md`
  - Pilot 階段：Critical=BLOCK, High=WARN

**驗收錨點**
- 有最新 `make audit-api` 產出與 policy 判定紀錄

**常見失敗點**
- 未跑 audit 就升級
- 高風險依賴被誤視為已處理

---

## 8) 硬體驗收口徑（售前 / 交付）

> 參考：`doc/HARDWARE_SIZING_GUIDE.md`

### 8.1 Tier S / M / L

- Tier S：4 vCPU / 16GB RAM / DB SSD 300~500GB
- Tier M：8 vCPU / 32GB RAM / DB NVMe 500GB~1TB
- Tier L：16 vCPU / 64GB RAM / DB NVMe 1~2TB

### 8.2 紅線

- DB Volume 與 Storage Volume 必須分開
- Disk > 80% 視為 P1

**驗收錨點**
- 安裝 Self-Check 全過
- `/health` OK
- 最小壓測（PDA 100 次/報表 1 次）【待補：實際測試腳本】

**常見失敗點**
- 客戶硬體不足卻硬上線（P95/Queue 深度長期爆）

---

## 9) HARDWARE_SIZING_GUIDE（關聯入口）

- 參考文件：`doc/HARDWARE_SIZING_GUIDE.md`

**驗收錨點**
- 客戶硬體符合 Tier 要求或有明確偏差記錄

**常見失敗點**
- 缺少偏差記錄，無法界定責任

---

## 10) API 契約與整合注意事項（最小集）

> 參考：`doc/API_SPECIFICATION.md`

- Base path：`/api/v1`【待補：repo 現況未見 /api/v1 路由】
- Idempotency-Key：
  - 寫入型 API 必須要求（規範已定）
  - 實作證據【待補】
- 常見錯誤語意：
  - 401/403/409/429/5xx（規範已定）

**驗收錨點**
- API 規範內有明確錯誤語意定義
- 實際 API 回應符合（目前需 evidence →【待補】）

**常見失敗點**
- 路由未加 `/api/v1` 仍對外宣稱已版本化
- 寫入型 API 未實作 Idempotency

---

## 11) API_SPECIFICATION（關聯入口）

- 參考文件：`doc/API_SPECIFICATION.md`

**驗收錨點**
- 端點規範含 Idempotency / Audit / Error Semantics

**常見失敗點**
- 只靠口頭規範，未落到實作或測試

---

## 12) DoD（Definition of Done）

- 非作者可照做跑通：
  - 啟動（API/Web）
  - /health 驗證
  - Gate
  - 基本事故處置（Disk > 80%）
  - DR 演練流程

**驗收錨點**
- 新人可在 30 分鐘內完成上述流程

**常見失敗點**
- 缺指令或缺入口導覽

---

## 13) 回滾點

- 純文件變更：
  - `git revert <commit>` 即可回滾

**驗收錨點**
- `git log` 可找到對應 commit

**常見失敗點**
- 文檔混入程式碼變更，回滾影響面擴大

