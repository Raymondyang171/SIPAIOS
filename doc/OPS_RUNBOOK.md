# 維運手冊（On-Prem v1.1）

- 文件等級：執行標準
- 目標：可監控、可告警、可還原、可遠端支援
- 鐵律：OBSERVABILITY.md 的每個 Critical Alert，都必須能在本檔找到 SOP

---

## 0. 維運紅線（限制）
- 未完成「備份可還原」演練：禁止重大升級
- 未完成「診斷包匯出」：禁止承諾遠端支援 SLA
- 磁碟 > 80%：視為 P1（先救火再談優雅）
- 發生 DR/還原/換機：必須執行「epoch 變更 + PDA 清洗 SOP」（SOP-K）

---

## 1. Daily（每日）
- 檢查：
  - /health
  - 磁碟/記憶體/CPU
  - 5xx 錯誤率、登入失敗飆升
  - Queue 深度（P1 任務等待）
- 備份：
  - 今日備份成功
  - 備份檔大小異常（過小/過大）
- 清理：
  - 依 Retention 清理暫存/匯出檔/webhook log

---

## 2. Weekly（每週）
- 慢查詢 Top N（次數/耗時/影響）
- 檢查高頻表的 vacuum/analyze 狀態（由排程觸發）
- 檢查磁碟成長率（避免半年後爆盤）：logs/exports/storage/db

---

## 3. Monthly / Quarterly（每月/每季）
- Monthly：權限審計（高權限帳號、已核准設備清單、Service Account 狀態）
- Quarterly：備份還原演練（測試環境）
- 升級前：必做一次還原驗證

---

## 4. Incident 分級（事件處理）
- P0：疑似資料外洩、越權、全面不可用
- P1：單客戶不可用、寫入異常、備份失敗、磁碟 > 90%
- P2：效能退化、看板延遲、報表失敗
- 每次事件必填：影響範圍、根因、立即修復、永久修復、預防措施

---

## 5. 備份策略（最小可交付）
- 本地：保留 7 天
- 異地：保留 30 天（S3/FTP/NAS，由客戶 IT 提供）
- 3-2-1 原則：至少 3 份、2 種媒介、1 份異地
- 每月抽驗：至少抽 1 次還原（否則備份等於心理安慰）

---

## 6. 發布檢查 (Release Checklist)

### Security Gate Policy (npm audit)

此規則由自動化腳本 `make audit-api` 判定，決定是否允許佈署：

| 狀態 | Exit Code | 條件 | 留痕 |
|------|-----------|------|------|
| **FAIL** | 2 | `critical_total > 0` OR (`prod_scope.mode != "dev_only"` AND `high_total > 0`) | 阻擋佈署 |
| **WARN** | 0 | `prod_scope.mode == "dev_only"` AND `high_total > 0` | `metadata.json` 記錄 `status: "WARN"` |
| **PASS** | 0 | 其他情況 | — |

**判斷邏輯說明：**
1. **FAIL (Exit 2)**:
   - `critical_total > 0`
   - OR (`prod_scope.mode != "dev_only"` AND `high_total > 0`)
   - 意即：有任何 critical 漏洞，或生產依賴中有 high 漏洞，則禁止佈署
2. **WARN (Exit 0，留痕)**:
   - `prod_scope.mode == "dev_only"` AND `high_total > 0`
   - 意即：僅開發依賴有 high 漏洞時，允許上線但透過 `metadata.json` 的 `status: "WARN"` 留痕
3. **PASS (Exit 0)**:
   - 其他情況（無 critical、無 high 或漏洞已清除）

**相關產出物：**
- `artifacts/scan/api-audit/latest/metadata.json` - 包含 `prod_scope.mode` 與漏洞統計
- `artifacts/scan/api-audit/latest/audit.json` - 完整 npm audit 報告
- `artifacts/scan/api-audit/latest/audit-prod.json` - 僅生產依賴的報告

---

# SOP 對照區（與 OBSERVABILITY.md 一一對應）

## SOP-A：Disk High（>80%）
- 立刻做：
  - 停用/延後非必要匯出與報表任務（P2/P3）
  - 觸發清理：exports/tmp/webhook log（依 Retention）
- 30 分鐘內做：
  - 匯出磁碟用量報告（DB/Logs/Storage 分開）
  - 評估是否需要搬移 Cold data（NAS/S3 相容）
- 記錄：
  - 寫入事件紀錄（原因、清理量、剩餘空間）

## SOP-B：Disk Critical（>90%）
- 立刻做（防止 DB/備份一起死亡）：
  - 進入保護模式：停用高風險功能（大量匯出、批次任務、Automation）
  - 若 DB 寫入已受影響：優先保 DB，必要時短暫只讀
- 後續：
  - 清出至少 15% 空間後才允許解除保護模式
  - 產出根因：為何成長未被提前預警

## SOP-C：Backup Failed（24h 無成功備份）
- 立刻做：
  - 檢查備份目錄空間與權限
  - 檢查 DB 連線與備份程序回傳錯誤
- 2 小時內做：
  - 立即補跑一次備份（不等排程）
  - 驗證備份檔可用（至少可列出內容/校驗通過）
- 記錄：
  - 寫入事件與後續預防措施

## SOP-D：5xx Spike（>2%）
- 立刻做：
  - 檢查最近部署/更新紀錄（是否剛升級）
  - 檢查 Nginx upstream、App health、DB 連線
- 30 分鐘內做：
  - 匯出診斷包（DIAGNOSTICS_BUNDLE）
  - 若可回滾且確認版本導致：執行回滾
- 記錄：
  - 影響範圍與回滾點

## SOP-E：P95 Latency（>2s）
- 立刻做：
  - 檢查 DB 慢查詢、索引缺失、連線池耗盡
  - 檢查 Queue 是否堆積（P1 卡住會拖慢）
- 1 小時內做：
  - 限流高成本端點（報表/匯出）
  - 排程離峰做 vacuum/analyze（或確認已執行）

## SOP-F：DB Conn High
- 立刻做：
  - 檢查是否連線洩漏（App/Worker）
  - 暫時提高連線池保護（降載）
- 後續：
  - 修補連線釋放問題
  - 若需要：引入 pgbouncer（On-Prem 也可用，但屬進階）

## SOP-G：Slow Query Surge
- 立刻做：
  - 拉 Top N 慢查詢（次數/耗時）
  - 先做「減載」：降報表/匯出
- 後續：
  - 補索引/改查詢/分批處理
  - 對高頻表建立維護窗口

## SOP-H：Queue P1 Stuck
- 立刻做：
  - 找出卡住的任務類型（匯出/整合/清理）
  - 暫停非 P1 任務，釋放資源
- 後續：
  - 任務需有 timeout、重試上限、dead-letter
  - 必要時做降級：延後非關鍵流程

## SOP-I：Webhook Dead 飆升
- 立刻做：
  - 檢查對方端點是否異常、簽章/密鑰是否更新
  - 啟用重送策略（有上限）
- 後續：
  - 提供重送報告與告警（避免默默失敗）

## SOP-J：Automation Trip（Agent 超閾值/失敗率高）
- 立刻做：
  - 觸發 Kill Switch：automation_enable = false（全域）或停用該 service account
  - 通知管理員並保留稽核紀錄
- 後續：
  - 回放該 Agent 的操作軌跡（audit log）
  - 修正閾值或增加人工覆核流程

## SOP-K：Epoch Mismatch（DR/還原後一致性風險）
- 立刻做：
  - 確認本次是否做過還原/換機/重大回復（server_epoch 應已 +1）
  - 封鎖舊 epoch 回寫：進入隔離清單（Quarantine）
- 後續：
  - 要求所有 PDA 重新握手更新 epoch
  - 對隔離事件做人工對帳（不得一鍵全入帳）
  - 產出「隔離事件報告」存檔
