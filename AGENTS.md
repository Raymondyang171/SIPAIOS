# AGENTS.md

本文件提供 AI Agent（Claude Code、Copilot、Cursor 等）在此專案協作的指引。

---

## Known Non-blocking Warnings

以下 warning 已被分類為「已知噪音」，**不阻塞 gate**，請勿重複追查。

| Warning | 狀態 | Runbook |
|---------|------|---------|
| DEP0176 (newman fs.F_OK) | Non-blocking | [KNOWN_WARNINGS.md](doc/runbooks/KNOWN_WARNINGS.md#dep0176-newman-fsfok) |

### 遇到這些 warning 時的行為

1. **不要**嘗試修復 newman 原始碼或升級依賴
2. **不要**將此 warning 視為 gate failure
3. **可以**在 log 中看到此 warning，這是預期行為
4. 若 warning 行為改變（變 error、阻塞 gate），請參考 runbook 中的「升級觸發條件」

---

## 專案規則

詳細的 Agent 行為規範請參考 [.clinerules](.clinerules)。
