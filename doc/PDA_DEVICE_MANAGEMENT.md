# PDA_DEVICE_MANAGEMENT（現場裝置與離線治理）

- 文件等級：執行標準
- 目的：解決工廠最痛的「現場管理」與「斷網運作」問題
- 適用：Android PDA、工控機、強固型平板

---

## 1. 裝置生命週期 (Device Lifecycle)
### 1.1 註冊與配對 (Onboarding)
- **流程**:
  1. 現場人員開啟 App，掃描 Server 提供的「配對 QR Code」(含 endpoint + temporary token)。
  2. 裝置產生 Key Pair，將 Public Key 送至 Server。
  3. Server 記錄 Device ID (UUID)，狀態為 `PENDING_APPROVAL`。
- **安全**:
  - 尚未核准的裝置，**只能**呼叫 `/status` API，無法讀取任何業務資料。

### 1.2 核准與撤銷 (Approval & Revocation)
- **核准**: 管理員在 Web 後台手動核准，裝置狀態變更為 `ACTIVE`。
- **撤銷**: 
  - 裝置遺失或損壞時，管理員執行 Revoke。
  - Server 拒絕該 Device ID 的所有請求 (401 Unauthorized)。

---

## 2. Kiosk 模式與安全防護
- **目標**: 防止作業員拿 PDA 玩遊戲或看影片。
- **實作 (Tier 1 - 推薦)**: **App Pinning (Lock Task Mode)**
  - App 啟動後自動進入全螢幕鎖定，隱藏 Home/Back 鍵。
  - 需設定 Admin PIN 碼才能退出 Kiosk 模式。
- **實作 (Tier 2)**: MDM (如需遠端派送 APK)。
- **物理安全**:
  - 禁止 USB 除錯 (ADB) 除非在維修模式。

---

## 3. 版本控管 (Version Enforcement)
- **機制**: 
  - Server 端維護 `sys_min_app_version`。
  - PDA 每次 API 請求 header 需帶 `X-App-Version`。
- **強制更新**:
  - 若 `X-App-Version` < `sys_min_app_version`，Server 回傳 `426 Upgrade Required`。
  - App 攔截 426，鎖定畫面並顯示下載/更新按鈕。

---

## 4. 離線優先實作規範 (Offline-First Implementation)
> 這是 V2.1 的 P0 重點：斷網不能是「例外」，而是「常態」。

### 4.1 寫入策略：Outbox Pattern
所有 PDA 端的寫入操作（報工、入庫），**嚴禁**直接呼叫後端 API，必須依循以下路徑：
1. **Local Commit**: 
   - 先寫入 PDA 本地 SQLite/IndexedDB 的 `outbox_queue` 表。
   - 狀態標記: `PENDING`
   - 產生 UUID: 作為 `Idempotency-Key` (確保重送也不會重複扣帳)。
2. **Background Sync**: 
   - 背景 Worker 監聽網路狀態 (NetworkCallback)。
   - 網路恢復時，讀取 `PENDING` 記錄，依序發送 API。
3. **Remote Confirm**: 
   - 收到 Server `200 OK` 後，標記本地記錄為 `SYNCED` 並從 Queue 移除。
   - 若收到 `4xx` (邏輯錯誤，如庫存不足)，標記 `FAILED` 並彈窗通知使用者人工介入。
   - 若收到 `5xx` (伺服器錯誤)，保持 `PENDING` 指數退避重試。

### 4.2 讀取策略：Stale-While-Revalidate
- **基礎資料快取**:
  - 關鍵資料（料號、BOM、工單列表）必須在 PDA 登入/充電時進行 **「全量/增量下載」** 至本地 DB。
- **存取邏輯**:
  - 斷網時：直接讀取本地 DB（容許資料過期）。
  - 連網時：背景靜默更新本地 DB (Silent Revalidation)，UI 優先顯示本地快取以確保速度。

---

## 5. 驗收標準 (DoD)
- 未經核准的裝置無法登入。
- App 支援 Kiosk 模式，無法隨意跳出。
- 拔掉網路線後，仍能完成「掃碼報工」流程，且插回網路線後資料自動回寫 Server。