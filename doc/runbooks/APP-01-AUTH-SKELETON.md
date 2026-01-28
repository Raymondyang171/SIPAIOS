# APP-01 Auth Skeleton Runbook

## 概述
此文件說明如何啟動 SIP AIOS Auth API Server 並執行 Postman 測試。

---

## 前置條件

1. **Node.js** >= 18.0.0
2. **PostgreSQL** 已啟動（透過 Docker Compose）
3. **資料庫已套用 Schema**（Phase 1 + Stage 2B/2C）

---

## 一、啟動基礎設施

```bash
# 進入專案根目錄
cd /home/pdblueray/SIPAIOS

# 啟動 Docker Compose（Postgres、Redis、MinIO、Nginx）
cd infra/compose && docker compose up -d

# 驗證 Postgres 運行中
docker exec sipaios-postgres pg_isready -U sipaios
# 預期輸出: /var/run/postgresql:5432 - accepting connections
```

---

## 二、安裝 API Server 依賴

```bash
cd /home/pdblueray/SIPAIOS/apps/api
npm install
```

---

## 三、Seed 測試資料

```bash
cd /home/pdblueray/SIPAIOS/apps/api
npm run seed
```

**預期輸出：**
```
Connecting to database...
Connected.
Generating password hash for test users...
Password hash: $2b$10$...
--- Running migration ---
Migration applied.
--- Seeding test users ---
Test users seeded.
--- Verification ---
Test users: [
  { id: '11111111-...', email: 'admin@demo.local', display_name: 'Demo Admin' },
  { id: '22222222-...', email: 'user@demo.local', display_name: 'Demo User' },
  { id: '33333333-...', email: 'multi@demo.local', display_name: 'Multi-Company User' }
]
✅ Seed complete!
```

**測試帳號：**
| Email | Password | 說明 |
|-------|----------|------|
| admin@demo.local | Test@123 | DEMO 公司管理員 |
| user@demo.local | Test@123 | DEMO 公司一般使用者 |
| multi@demo.local | Test@123 | 多公司使用者（DEMO + Test Company 2） |

---

## 四、啟動 API Server

```bash
cd /home/pdblueray/SIPAIOS/apps/api
npm start
```

**預期輸出：**
```
SIP AIOS API Server running on port 3001
Health check: http://localhost:3001/health
```

**驗證 Health Check：**
```bash
curl http://localhost:3001/health
# 預期: {"status":"ok","db":"connected"}
```

---

## 五、執行 Postman 測試

### 方法 A：Postman GUI

1. 開啟 Postman
2. 匯入 Collection：`apps/api/postman/SIP-AIOS-Auth.postman_collection.json`
3. 匯入 Environment：`apps/api/postman/SIP-AIOS-Local.postman_environment.json`
4. 選擇環境 "SIP AIOS Local"
5. 點擊 Collection Runner → Run Collection
6. 所有測試應顯示 PASS（綠色）

### 方法 B：Newman CLI（一鍵測試）

```bash
# 安裝 Newman（如未安裝）
npm install -g newman

# 執行測試
cd /home/pdblueray/SIPAIOS/apps/api
newman run postman/SIP-AIOS-Auth.postman_collection.json \
  -e postman/SIP-AIOS-Local.postman_environment.json
```

**預期輸出：**
```
┌─────────────────────────┬───────────────────┬──────────────────┐
│                         │          executed │           failed │
├─────────────────────────┼───────────────────┼──────────────────┤
│              iterations │                 1 │                0 │
├─────────────────────────┼───────────────────┼──────────────────┤
│                requests │                 9 │                0 │
├─────────────────────────┼───────────────────┼──────────────────┤
│            test-scripts │                18 │                0 │
├─────────────────────────┼───────────────────┼──────────────────┤
│      prerequest-scripts │                 0 │                0 │
├─────────────────────────┼───────────────────┼──────────────────┤
│              assertions │                21 │                0 │
└─────────────────────────┴───────────────────┴──────────────────┘
```

---

## 六、API 端點說明

### POST /login
驗證使用者憑證並發放 JWT。

**Request:**
```json
{
  "email": "admin@demo.local",
  "password": "Test@123"
}
```

**Response (200):**
```json
{
  "token": "eyJhbG...",
  "user": {
    "id": "11111111-1111-1111-1111-111111111111",
    "email": "admin@demo.local",
    "display_name": "Demo Admin"
  },
  "companies": [
    {
      "company_id": "9b8444cb-d8cb-58d7-8322-22d5c95892a1",
      "company_code": "DEMO-COM-001",
      "company_name": "DEMO companies",
      "tenant_id": "9b8444cb-d8cb-58d7-8322-22d5c95892a1",
      "tenant_slug": "demo-com-001",
      "is_admin": true
    }
  ],
  "current_company": { ... }
}
```

### POST /switch-company
切換當前操作的公司（需先登入）。

**Request:**
```json
{
  "company_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002"
}
```

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "token": "eyJhbG...",  // 新 token 包含更新後的 company_id
  "current_company": {
    "company_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeee0002",
    "company_code": "TEST-COM-002",
    "company_name": "Test Company 2",
    ...
  }
}
```

---

## 七、故障排除

### 問題：Database connection refused
```
Error: connect ECONNREFUSED 127.0.0.1:55432
```
**解決方案：**
1. 確認 Docker Compose 正在執行：`docker ps | grep sipaios-postgres`
2. 確認 port mapping 正確：`docker port sipaios-postgres`

### 問題：relation "sys_users" does not exist
**解決方案：**
確保已套用 Phase 1 + Stage 2B Schema：
```bash
cd /home/pdblueray/SIPAIOS/scripts/db
./00_replay_phase1_v1_1.sh
./01_replay_stage2b_rbac_v1_0.sh
./02_replay_stage2c_company_scope_v1_0.sh
```

### 問題：Invalid email or password（確定密碼正確）
**解決方案：**
重新執行 seed 以確保密碼 hash 正確：
```bash
cd /home/pdblueray/SIPAIOS/apps/api
npm run seed
```

---

## 八、開發模式

```bash
# 使用 --watch 自動重載
cd /home/pdblueray/SIPAIOS/apps/api
npm run dev
```

---

## 版本資訊

- **Task**: SVC-APP-01-AUTH-SKELETON
- **Date**: 2026-01-28
- **Status**: DONE
