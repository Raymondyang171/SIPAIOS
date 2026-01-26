# HARDWARE_SIZING_GUIDE — 硬體規格建議（On-Prem｜v2.1）

- 文件等級：售前/交付標準（Deployment Readiness）
- 目標：用「可驗證」的規格，避免客戶用不合格硬體導致效能/穩定事故
- 假設：每客戶 < 50 使用者（含 PDA/設備），每年新客戶 < 5（v2.1）

---

## 0) Sizing 紅線（Hard Rules）
- DB Volume 與 Storage Volume 必須分開規劃（避免互相拖垮）。
- 磁碟使用率 > 80%：視為 P1（先救火再談優雅）。
- 時區/NTP 必須一致（否則稽核/報表會變成玄學）。
- 若客戶要開外網：必須 HTTPS + Rate limit + Device Trust。

---

## 1) 三檔建議規格（Baseline Tiers）
> 實際需依「資料量、附件量、報表頻率、併發」調整；下列為 v2.1 典型落地值。

### Tier S（小型｜試點/單廠）
- CPU：4 vCPU
- RAM：16 GB
- Disk：
  - DB：SSD 300~500 GB（建議 NVMe）
  - Storage：SSD/HDD 依附件量（建議 500GB 起）
- IOPS：建議 NVMe 等級（隨機 IO）
- 適用：少量附件、報表不頻繁

### Tier M（標準｜多班別/附件較多）
- CPU：8 vCPU
- RAM：32 GB
- Disk：
  - DB：NVMe 500GB~1TB
  - Storage：1TB 起（視附件/影像）
- 適用：多 PDA、報表每日多次、附件量中等

### Tier L（大型｜報表重/附件爆量）
- CPU：16 vCPU
- RAM：64 GB
- Disk：
  - DB：NVMe 1~2TB
  - Storage：依年增量估算（可走 NAS/物件儲存）
- 適用：大量匯出、影像/文件量大、需要更穩的 P95

---

## 2) 容量估算（快速口徑）
### 2.1 DB 成長
- 交易/報工/稽核：通常是「每天持續長大」
- 建議：先抓 12 個月成長量 + 30% buffer
- 若未能估算：先用 Tier M，並要求三個月後用監控數據調整

### 2.2 Storage 成長（附件/影像）
- 影像與文件是爆盤主因
- 建議：估算
  - 每日上傳筆數 × 平均檔案大小 × 365
  - 再加上報表產物與暫存（Retention 控制）

---

## 3) 網路與拓撲建議
- 內網部署：建議 1GbE
- 若跨廠/VPN：優先確保延遲與穩定性（看板可用輪詢換穩定）
- 建議由 Nginx 做：
  - TLS 終止
  - IP allowlist（若需要）
  - 基礎 Rate limit

---

## 4) 觀測驅動調整（Sizing 的真正答案）
部署後必看指標：
- API P95 latency
- DB connections / slow queries
- Queue depth（P1/P2/P3/P4）
- Disk usage（DB/Storage/Logs）
- 報表匯出耗時與失敗率

若出現：
- P95 明顯超標 + DB I/O 飆高 → 先升級 DB NVMe / RAM
- Queue depth 長期偏高 → 增加 Worker 資源或降低 P4 配額
- Disk 快到 80% → 先調 Retention（暫存/報表產物/webhook logs）

---

## 5) 驗收錨點（客戶硬體是否合格）
- 安裝 Self-Check 全過
- /health OK（DB/Redis/Storage/Queue）
- 壓測（最小）：
  - PDA 連續掃碼/報工 100 次不丟焦點、不錯亂
  - 上傳/下載附件 OK
  - 報表匯出 1 次 OK（時間可接受）
- Disk 使用率可控（Retention 正常運作）

> 你可以把這份文件當作售前的「防雷聲明」：不是我們挑硬體，是事故會挑我們睡覺時來。
