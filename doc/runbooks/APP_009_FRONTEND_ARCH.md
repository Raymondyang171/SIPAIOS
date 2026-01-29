# APP-009: Frontend Architecture Runbook

## Overview

Next.js App Router 前端專案骨架，位於 `apps/web/`。

## Quick Start

```bash
# 1. 進入 web 目錄（重要：不是專案根目錄）
cd apps/web

# 2. 安裝依賴（若尚未安裝）
pnpm install

# 3. 啟動 dev server
pnpm dev
```

Dev server 預設在 http://localhost:3000

## Directory Structure

```
apps/
├── api/          # Backend API (port 3001)
└── web/          # Frontend (port 3000) ← 你在這裡
    ├── app/      # App Router pages
    ├── public/   # Static assets
    └── .env.local
```

## Common Mistakes

### 錯誤：在專案根目錄執行 pnpm dev

```bash
# 錯誤 - 根目錄沒有 package.json
cd /home/pdblueray/SIPAIOS
pnpm dev  # ❌ 會失敗

# 正確 - 進入 apps/web
cd /home/pdblueray/SIPAIOS/apps/web
pnpm dev  # ✅
```

### 錯誤：Port 3000 已被佔用

```bash
# 檢查誰佔用了 3000
lsof -i :3000

# 或改用其他 port
pnpm dev -p 3001
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL | `http://localhost:3001` |

## Related

- Backend API: [APP-01-AUTH-SKELETON.md](./APP-01-AUTH-SKELETON.md)
