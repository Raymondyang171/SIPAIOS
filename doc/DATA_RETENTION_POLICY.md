## 2) `DATA_RETENTION_POLICY.md`

```md
# DATA_RETENTION_POLICY — 資料保留與清理政策（v2.1）

- 文件等級：執行標準（On-Prem 必備）
- 目標：避免磁碟爆滿、避免 DB 膨脹、符合稽核可追溯
- 核心原則：先「可清理、可驗證、可回復」，再追求優雅

---

## 0) Retention 紅線（Hard Rules）
- 必須有 Retention Worker（或等效排程）每日執行。
- 必須提供：
  - Dry-run（只列出將刪除/歸檔項）
  - 實際執行報告（清了什麼、清了多少、耗時）
- 任何清理不得包含 secrets/PII 泄露到 log（診斷包需脫敏）。

---

## 1) 資料分類與預設保留期限（Baseline）
> 客戶可依合規調整，但需留下變更紀錄與稽核事件。

| 類別 | 範例 | 線上保留 | 歸檔保留 | 處置方式 |
|---|---|---:|---:|---|
| Webhook delivery logs | 送出/回應/錯誤 | 90 天 | 1 年 | 線上刪除或歸檔後刪除 |
| 報表產物（檔案） | 匯出 xlsx/pdf | 30 天（可 7 天） | 選配 | Storage 刪除 |
| 暫存資料 | upload tmp / job tmp | 7 天 | 不歸檔 | 直接刪除 |
| 審計日誌 | login/device/role change | 1~2 年 | 10 年（選配） | 線上轉冷資料 |
| 交易/生產資料 | 工單、報工、庫存 | 2~3 年 | 5~7 年（選配） | 線上保留；可做冷表 |
| 系統指標報告 | top sql / ops reports | 180 天 | 選配 | 依容量調整 |

> 說明：On-Prem 多數事故不是「資料太少」，是「資料太多且沒人清」。

---

## 2) 清理策略（Delete vs Archive）
- Delete（刪除）：適用暫存、報表產物、Webhook logs（線上期過後）
- Archive（歸檔）：適用審計/交易等「稽核可能要求」資料
  - 建議：歸檔到冷表（同 DB）或冷儲存（客戶 IT 提供）
  - v2.1 最小交付：允許先不做跨系統歸檔，但要能「刪暫存/刪報表/刪 webhook log」

---

## 3) 磁碟水位與自動降級（On-Prem 防爆盤）
### 3.1 水位門檻（建議）
- Disk > 70%：提升清理頻率（每日 → 每 6 小時一次），並告警（P2）
- Disk > 80%：視為 P1，強制清理暫存 + 報表產物 + webhook logs（若超線上期）
- Disk > 90%：進入緊急模式（只保留核心交易/審計），並提示客戶擴容

### 3.2 緊急模式（Emergency Retention）
- 暫存：立即清
- 報表產物：保留縮短到 3~7 天
- Webhook logs：保留縮短到 30 天（需管理員確認）

> 原則：先讓系統活著，合規再談「怎麼更漂亮」。

---

## 4) Retention Worker（排程與輸出）
### 4.1 頻率（建議）
- Daily：清暫存、清報表產物、清 webhook logs（到期）
- Weekly：彙總報告（刪除量、DB 表膨脹趨勢、慢查詢摘要）

### 4.2 輸出（必備）
每次執行必須輸出：
- 開始/結束時間、耗時
- 清理項目數量（records/files）
- 釋放空間估算
- 是否有錯誤（含 retry 次數）
- 若失敗：告警 + 下次自動重試

---

## 5) 設定與變更管理（Config）
Retention 參數必須可配置（建議在 sys_config 或 env）：
- WEBHOOK_LOG_RETENTION_DAYS（預設 90）
- REPORT_ARTIFACT_RETENTION_DAYS（預設 30）
- TEMP_RETENTION_DAYS（預設 7）
- AUDIT_LOG_RETENTION_DAYS（預設 365~730）
- EMERGENCY_MODE_ENABLED（bool）

任何變更必須：
- 產生稽核事件（誰改、改什麼、何時）
- 產生告警（避免被悄悄縮短）

---

## 6) 驗收錨點（必測）
- 連續跑 7 天：磁碟用量可預期、不爆炸
- Dry-run：能列出將刪除/將清理的清單摘要
- 實跑：產出報告，且不含敏感資訊
- Disk>80%：能觸發強制清理與告警
