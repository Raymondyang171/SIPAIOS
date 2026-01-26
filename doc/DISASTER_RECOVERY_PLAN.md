# DISASTER_RECOVERY_PLAN — 災難恢復（DR）演練計畫與紀錄範本（v2.1）

- 文件等級：稽核交付標準（Audit Required）
- 目標：把「我們可以還原」變成「我們演練過、量測過、有改進」
- 範圍：On-Prem Appliance（每客戶一套 stack）

---

## 0) DR 紅線（Hard Rules）
- 未做「季度還原驗證」：禁止重大升級（Go/No-Go gate）
- 年度 DR 必須是「全流程」：
  - 不是只還原 DB
  - 必須包含：DB + Storage + Config + App/Worker 重建 + 健康檢查 + 抽樣驗證
- 每次 DR 必須量測：
  - RTO（恢復時間）
  - RPO（資料損失窗口）
  - 實測值必須紀錄

---

## 1) 目標指標（Targets）
> 依 v2.1 假設：DB <100GB 的 Offline Copy

- 目標 RTO：< 2 小時（可按客戶 SLA 調整）
- 目標 RPO：依備份頻率（例如每日全量 → RPO ≤ 24h；若含 WAL/PITR → 可更小）

---

## 2) 演練頻率（v2.1 建議）
- Quarterly（每季）：還原驗證（測試環境）
- Yearly（每年）：全流程 DR（含量測 RTO/RPO）
- Major Upgrade 前：必做一次還原驗證

---

## 3) 演練場景（Scenario Library）
至少涵蓋：
- S1：DB Volume 損毀（需要從備份還原）
- S2：Storage Volume 損毀（附件/報表需還原）
- S3：主機不可用（需要在新主機重建整套）
- S4：誤操作（需要回到某時間點；若無 PITR，至少能回到最近備份）

---

## 4) DR 演練紀錄（每次必填）
### 4.1 基本資訊
- 客戶/租戶（Tenant）：
- 演練日期：
- 演練類型：Quarterly Restore / Yearly Full DR / Pre-Upgrade Restore
- 參與人員：
- 版本資訊：App / Worker / DB / Redis / Storage / schema_version
- 環境：測試 / 預備機 / 生產隔離環境

### 4.2 目標與實測
- Target RTO：
- Actual RTO：
- Target RPO：
- Actual RPO：
- 停機窗口（如有）：
- 是否符合 SLA：Yes / No（原因）

### 4.3 執行步驟（勾選 + 記錄時間戳）
1. 取得最新備份（備份 ID/檔名/時間）：
2. 驗證備份完整性（checksum/manifest）：
3. 還原 DB（開始/結束）：
4. 還原 Storage（開始/結束）：
5. 還原 Config / Secrets（確認方式，不記錄明文）：
6. 啟動服務（compose/up）：
7. 健康檢查：/health OK（時間）：
8. 抽樣驗證：
   - 登入成功
   - PDA/設備流程跑通（至少 1 條）
   - 上傳/下載檔案 OK
   - 事件/報表（至少 1 條）OK
9. 產出 DR 報告與問題清單

### 4.4 問題與根因（Findings）
- F1：
  - 影響：
  - 根因：
  - 暫解：
  - 永久解：
  - Owner：
  - Due date：
- F2：
  ...

### 4.5 改進行動（Action Items）
- A1（P0/P1/P2）：
- A2（P0/P1/P2）：

### 4.6 附件
- 備份 manifest（路徑）：
- 日誌摘要（路徑）：
- 截圖/證據（路徑）：

---

## 5) 年度 DR 建議驗收門檻（Go/No-Go）
- RTO/RPO 達標（或有經核准的偏差說明）
- 還原流程文件更新（Runbook / Migration / Update）
- 監控告警驗證（disk、backup fail、5xx、queue depth）
- 重大缺陷（P0/P1）有明確修復計畫與期限

> 備註：DR 演練不是「一次性儀式」，它是你把事故成本從「凌晨」搬到「上班時間」的唯一方法。
