# 安裝指南（On-Prem Appliance）

- 文件等級：執行標準
- 目標：客戶 IT 可在「乾淨 Linux」完成安裝與驗收

---

## 0. 安裝紅線（限制）
- 未通過 Self-Check：不得進入正式部署
- 密鑰/憑證/Token 禁止寫入 repo；只能放在客戶端安全儲存（env/secret 檔案權限）
- 任何外網暴露：必須 HTTPS + Rate Limit + Device Trust

---

## 1. 支援環境（宣告即契約）
- OS：Ubuntu / Debian / Rocky / CentOS（擇一主線，其他為 best-effort）
- 時區/NTP：必須一致（否則稽核/報表/工單時間會變成玄學）
- 磁碟：DB Volume 與 Storage Volume 需獨立規劃（避免互相拖垮）

---

## 2. 標準交付物（必備）
- 安裝腳本：install（含 self-check）
- compose：完整 stack（含 healthcheck、restart policy）
- 更新：update（含 preflight、rollback）
- 備份：backup / restore
- 遷移：export / import（SaaS → On-Prem）
- 診斷：export-diagnostics
- 文件：本 /docs 套件

---

## 3. Self-Check（必做）
- Docker/Compose 版本符合最低要求
- Port 未衝突（HTTP/HTTPS/DB/MinIO 等）
- 磁碟剩餘空間與 inode 足夠
- 時區與 NTP 正常
- 目錄權限可寫（DB/Storage/Backup/Logs）

---

## 4. 安裝後驗收錨點（必測）
- /health 顯示 OK
- 可建立 Admin 帳號並登入
- schema_version 正確（App 啟動硬檢查）
- 可建立一台 PDA 並完成配對或核准
- 可執行一次備份並驗證備份檔存在
