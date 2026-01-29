# 可觀測性（最小可交付 v1.1）

- 文件等級：執行標準
- 目標：先可定位問題，再追求漂亮儀表板
- 鐵律：每個 Critical Alert 必須在 OPS_RUNBOOK.md 有對應 SOP，否則該 Alert 視為噪音，必須刪掉或降級

---

## 0. 紅線（限制）
- 必須有 /health
- 必須有 /admin/metrics（JSON）
- 日誌必須結構化（JSON），且禁含 PII

---

## 1. 必備指標（Metrics）
- requests/min、5xx rate、P95 latency
- DB connections、慢查詢計數
- Queue depth（分 P1/P2/P3/P4）
- Disk usage（DB/Storage/Logs）
- Runtime Agent（若啟用）：每分鐘動作數、失敗率、被熔斷次數

---

## 2. Critical Alerts（必須可行動）
> 下面每一條都要能「立刻照 SOP 做事」。

| Alert | 觸發條件（建議） | 立刻風險 | 對應 SOP（OPS_RUNBOOK.md） |
|---|---|---|---|
| Disk High | Disk > 80%（10 分鐘） | 爆盤→DB/備份全掛 | SOP-A |
| Disk Critical | Disk > 90%（5 分鐘） | 立即停機風險 | SOP-B |
| Backup Failed | 24h 內無成功備份 | 無法復原 | SOP-C |
| 5xx Spike | 5xx > 2%（5 分鐘） | 服務不穩定 | SOP-D |
| P95 Latency | P95 > 2s（10 分鐘） | 現場卡頓 | SOP-E |
| DB Conn High | 連線數接近上限 | 雪崩前兆 | SOP-F |
| Slow Query Surge | 慢查詢數飆升 | 交易延遲 | SOP-G |
| Queue P1 Stuck | P1 等待超門檻 | 任務堆積 | SOP-H |
| Webhook Dead | dead/failed 飆升 | 外部整合中斷 | SOP-I |
| Automation Trip | Agent 超閾值/失敗率高 | 無限下單/亂改 | SOP-J（含 Kill Switch） |
| Epoch Mismatch | epoch mismatch 次數>0 | DR 後一致性風險 | SOP-K（含 PDA 清洗） |

---

## 3. 選配：Loki/Grafana（如客戶允許）
- Loki 多租戶標頭與隔離方式見 REFERENCES.md（官方文件）
- Opt-in 健康回報：只回報版本/磁碟/錯誤數，不含業務資料
