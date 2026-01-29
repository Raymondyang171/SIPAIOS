# Known Warnings Runbook

本文件記錄專案中「已知且刻意不處理」的 warning，避免重複追查。

---

## DEP0176: newman fs.F_OK

| 欄位 | 內容 |
|------|------|
| **Warning ID** | DEP0176 |
| **現象** | Node 顯示 `[DEP0176] DeprecationWarning: fs.F_OK is deprecated, use fs.constants.F_OK instead` |
| **觸發位置** | `newman` 內部 `lib/run/secure-fs.js:146` |
| **根因** | Newman 使用 `fs.F_OK` / `fs.R_OK` / `fs.W_OK` / `fs.X_OK`，這些在 Node 22+ 被標記為 runtime deprecation，應改用 `fs.constants.*` |
| **現行決策** | **Non-blocking** — 不阻塞 gate，視為已知噪音 |
| **決策日期** | 2025-01-29 |

### 升級觸發條件（任一即需處理）

- [ ] Warning 變成 gate fail（exit code 非 0）
- [ ] Warning 升級為 error（Node 移除該 API）
- [ ] 噪音遮蔽真正的錯誤訊息，影響除錯
- [ ] Go-Live 前需輸出乾淨 log

### 處理方式（當觸發條件成立時）

1. 檢查 newman 是否有新版修復此問題
2. 若無，考慮 fork 或使用 `--disable-warning=DEP0176` 旗標
3. 或升級至官方修復版本

### 參考來源

- Newman upstream issue: [postmanlabs/newman#3324](https://github.com/postmanlabs/newman/issues/3324)
- Node.js v22→v24 migration: [fs-access-mode-constants deprecation](https://nodejs.org/docs/latest/api/deprecations.html#DEP0176)

---

## 新增條目範本

```markdown
## WARNING_ID: 簡短描述

| 欄位 | 內容 |
|------|------|
| **Warning ID** | ... |
| **現象** | ... |
| **觸發位置** | ... |
| **根因** | ... |
| **現行決策** | Non-blocking / Blocking / Monitoring |
| **決策日期** | YYYY-MM-DD |

### 升級觸發條件
- [ ] ...

### 處理方式
1. ...

### 參考來源
- ...
```
