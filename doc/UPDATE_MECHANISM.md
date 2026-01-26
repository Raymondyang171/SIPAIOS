# 更新機制（Pull + Offline Bundle）

- 文件等級：執行標準
- 目標：能更新、能驗證、能回滾、能離線

---

## 0. 更新紅線（限制）
- 更新包必須完整性驗證（checksum/簽章）；失敗即禁止升級
- migration 必須先 preflight；失敗即禁止升級
- 每次升級必須產生升級紀錄（版本、時間、結果、回滾點）

---

## 1. Online Pull（可出網）
- 客戶管理員手動或排程觸發「檢查更新」
- 成功下載後：
  - 先進入維護模式（可選）
  - 重啟 App/Worker
  - 自動 migration
  - 健康檢查通過才解除維護

---

## 2. Offline Bundle（不可出網，必備）
- 我方交付離線更新包：
  - images + 組態 + manifest + checksum/簽章
- 客戶匯入後：
  - 驗證 → 升級 → 產出升級報告

---

## 3. Rollback（回滾策略）
- App/Worker：可回到上一版映像
- DB：
  - 可逆 migration：允許自動回滾（需明確標記）
  - 不可逆 migration：只能還原備份（需停機）

---

## 4. 相容策略（限制）
- API：N-1 支援 6~12 個月
- DB：schema_version 硬檢查（避免舊 App 跑新 DB）
