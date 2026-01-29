# SVC Rewriter for Claude Code Agent

**用途**：將 ChatGPT 5.2 產生的原始 SVC 重寫成適合 Claude Code Agent 執行的格式

**使用方式**：
1. 從 ChatGPT 5.2 取得原始 SVC（通常較簡短、抽象）
2. 把原始 SVC 貼給 Claude，並加上這個 rewriter prompt
3. Claude 會產出優化版 SVC，然後再執行

---

## 📋 Rewriter Prompt（直接複製使用）
````plaintext
我將給你一個從 ChatGPT 5.2 產生的原始 SVC（Service Change）任務。
請根據「Claude Code Agent 的執行特性」重寫這個 SVC，使其更適合你執行。

════════════════════════════════════════════════════════════════
【原始 SVC】（來自 ChatGPT 5.2）
════════════════════════════════════════════════════════════════
<在此貼上原始 SVC 內容>

════════════════════════════════════════════════════════════════
【重寫指引】
════════════════════════════════════════════════════════════════
請按以下結構重寫，補充缺失的細節：

§ 0. 前置作業（必須先執行）
----------------------------
1. 列出需要先讀取的檔案（理解 context）
   - 現有實作檔案（如 service/controller/script）
   - 相關配置或文檔
   - 最近的錯誤 log（如果是修 bug）

2. 確認需理解的關鍵概念
   - 技術原理（如 pg_restore 的 --clean 行為）
   - 業務邏輯（如 RBAC 規則、資料流）
   - 現有流程的步驟順序

§ 1. 問題分析（Evidence）
--------------------------
【根本原因】
- 從 log/錯誤訊息提取具體證據
- 用「失敗鏈」呈現因果關係（1→2→3→失敗）

【當前影響】
- 列出無法運作的功能或流程
- 說明對其他模組的連鎖影響

§ 2. 目標
---------
✅ 具體可測的成功標準（不要用「改善」「優化」等模糊詞）
❌ 明確列出「不改變」的範圍（避免過度修改）

§ 3. 白名單（只能改這些檔案）
-----------------------------
原因：<為何只能改這些，改其他會有什麼風險>

1. <檔案路徑 1>（主要修改點）
2. <檔案路徑 2>（次要/可選）
3. <檔案路徑 3>（文檔更新）

最多 3-5 個檔案，避免改動過廣。

§ 4. 技術方案（含具體範例）
---------------------------
【方案 A：<名稱>（推薦/可選）】
- 用可執行的代碼片段說明（不要只寫「修改 XXX」）
- 給出 BEFORE/AFTER 對照
- 說明為何選這個方案

【方案 B：<替代方案>】
- 同上

【方案 C：<輔助措施>】
- 例如改善錯誤日誌、補充測試

§ 5. 禁止事項
-------------
❌ 不得修改 <具體檔案/資料庫/配置>
❌ 不得改變 <業務邏輯/權限模型/資料結構>
❌ 回覆時只貼「關鍵變更摘要」（≤15 行），完整 diff 用路徑指示
   範例：
   ✅ "在 service.ts 第 45 行加入 idempotency 檢查"
   ❌ 貼 80 行完整代碼

❌ 若改動後測試失敗：
   - 必須提供「一鍵回滾」指令
   - 必須說明「失敗在哪一步」與「錯誤訊息」

§ 6. 驗收標準（PASS Criteria）
-------------------------------
【必須全部 PASS】

P1. <主要功能測試>
```bash
    <可執行的測試指令>
    <期望結果>
```

P2. <次要功能測試>
```bash
    <可執行的測試指令>
    <期望結果>
```

P3. <邊界條件測試>
```bash
    <可執行的測試指令>
    <期望結果>
```

P4. <冪等性測試>（如果是寫入型操作）
```bash
    <重複執行指令>
    <期望：仍然成功>
```

P5. <整合測試>（如果影響其他模組）
```bash
    <後續流程測試指令>
    <期望結果>
```

§ 7. 回覆契約（分兩階段）
-------------------------
【階段 1：規劃確認】

0. 變更影響評估：
   a) 受影響檔案：<列出 1-5 個>
   
   b) 技術方案選擇：
      - 採用哪個方案？
      - 理由：<1-2 句話>
   
   c) 風險點：
      - <列出 1-3 個風險>
      - 緩解措施：<對應的緩解措施>
   
   d) 回退策略：
      - 若失敗：<檢查什麼 log>
      - 若需復原：<git restore 指令>
   
   e) 是否需要我確認後再動手？(YES/NO)

【階段 2：執行結果】（只有在階段 1 獲准後才執行）

1. 狀態：DONE / ERROR

2. 實際改動檔案路徑列表（每檔 1 句話摘要）

3. 關鍵變更摘要（≤15 行代碼片段）

4. 我下一步怎麼測（逐步、可操作、含期望值）
```bash
   # Step 1: <說明>
   <指令>
   # 期望: <具體結果>
   
   # Step 2: <說明>
   <指令>
   # 期望: <具體結果>
```

5. Self-Check 清單（從 § 6 複製過來）
   - [ ] P1: <測試項>
   - [ ] P2: <測試項>
   - [ ] ...

6. 若 ERROR：
   a) 錯誤訊息原文（不加修飾）
   b) 失敗在哪一步
   c) 相關 log 位置
   d) 回滾指令
   e) 需要什麼額外資訊

════════════════════════════════════════════════════════════════
【Claude 特定強化項】
════════════════════════════════════════════════════════════════
請在重寫時特別注意以下 Claude Code Agent 的特性：

1. **Context Window 管理**
   - 如果原始 SVC 要改的檔案很大（>300 行），建議拆成多個小檔案
   - 在 § 3 白名單加上「為何只改這些」的理由

2. **Type Safety 要求**
   - 如果是 TypeScript/Go 代碼，§ 4 技術方案必須包含完整型別定義
   - 範例：
```typescript
     interface CreateOrderDTO {
       material_no: string;
       qty: number;
       idempotency_key: string;
     }
```

3. **Idempotency 檢查**
   - 如果是寫入型 API/操作，§ 4 必須明確說明如何處理 idempotency
   - § 6 必須包含「重複執行仍成功」的測試

4. **Audit Trail 要求**
   - 如果是敏感操作（權限變更/資料修改/設備管理），§ 4 必須包含 audit log
   - 範例：
```typescript
     await this.auditService.log({
       event_type: 'WORK_ORDER_APPROVED',
       actor_id: userId,
       resource_id: woId,
       changes: { status: { from: 'PENDING', to: 'APPROVED' } }
     });
```

5. **Transaction 邊界**
   - 如果涉及多步驟資料庫操作，§ 4 必須明確標示 transaction 範圍
   - 範例：
```typescript
     await this.db.transaction(async (tx) => {
       await tx.update(...);
       await tx.insert(...);
       await this.auditService.log(..., tx);
     });
```

6. **Error 可行動化**
   - § 4 的錯誤處理必須提供「可行動的下一步」
   - 範例：
```typescript
     throw new InventoryNotFoundError(materialNo, {
       suggestion: '請先建立料號主檔，或檢查料號是否輸入正確'
     });
```

7. **具體範例優先**
   - 避免「調整 XXX」「優化 YYY」等抽象描述
   - 改用「在 X 檔案第 Y 行插入 Z 代碼」

8. **RBAC 最終裁決點**
   - 如果涉及權限，§ 4 必須說明「Service 層是最終裁決點」
   - UI 層只做顯示 gate，不做安全邊界

════════════════════════════════════════════════════════════════
【輸出格式】
════════════════════════════════════════════════════════════════
請以 Markdown 格式輸出完整的重寫版 SVC，包含：
- § 0 到 § 7 的完整結構
- 所有具體範例（代碼片段、測試指令、期望結果）
- 清晰的分隔線（用 ════ 標示各章節）

重寫完成後，直接開始執行【階段 1：規劃確認】。
````

---

## 🎯 使用範例

### 情境：從 ChatGPT 5.2 取得原始 SVC
````plaintext
原始 SVC（from ChatGPT 5.2）：
"請修復 OrderService 的 createOrder 方法，確保在高並發時不會產生重複訂單。需要加入 idempotency 保護，並記錄 audit log。"
````

### Step 1：把原始 SVC 貼給 Claude
````plaintext
@doc/prompts/svc_rewriter_for_claude.md

我將給你一個從 ChatGPT 5.2 產生的原始 SVC 任務。
請根據「Claude Code Agent 的執行特性」重寫這個 SVC。

════════════════════════════════════════════════════════════════
【原始 SVC】（來自 ChatGPT 5.2）
════════════════════════════════════════════════════════════════
請修復 OrderService 的 createOrder 方法，確保在高並發時不會產生重複訂單。需要加入 idempotency 保護，並記錄 audit log。
````

### Step 2：Claude 會自動產出優化版 SVC
````markdown
【SVC：修復 OrderService 高並發重複訂單問題】

§ 0. 前置作業
1. 先讀取：
   - services/order/order.service.ts（現有實作）
   - phase1_schema_v1.1_sql/supabase/tables/sys_idempotency_keys.sql
   - doc/SECURITY_MODEL.md（Audit Log 規範）

§ 1. 問題分析
【根本原因】
- createOrder 方法未檢查 idempotency key
- 高並發時可能同時插入相同訂單
- 缺少 audit trail

§ 2. 目標
✅ createOrder 支援 idempotency key（重送不重複建單）
✅ 所有訂單建立寫入 audit log
❌ 不改變訂單資料結構
❌ 不改變現有 RBAC 規則

§ 3. 白名單
1. services/order/order.service.ts
2. services/order/order.dto.ts（新增 idempotency_key 欄位）
3. tests/order.service.test.ts（補充測試）

§ 4. 技術方案
【方案 A：Idempotency Pattern】
```typescript
// order.dto.ts
export interface CreateOrderDTO {
  material_no: string;
  qty: number;
  idempotency_key: string; // 新增：用於防重複
}

// order.service.ts
async createOrder(input: CreateOrderDTO, actor: Actor): Promise<Order> {
  // 1. 檢查 idempotency key
  const existing = await this.idempotencyRepo.get(input.idempotency_key);
  if (existing) {
    if (existing.request_hash === hash(input)) {
      return existing.response_body; // 同 payload → 回傳快取
    }
    throw new ConflictError('Idempotency key reused with different payload');
  }

  // 2. 執行業務邏輯
  return this.db.transaction(async (tx) => {
    const order = await tx.insert('orders', input);
    
    // 3. 記錄 idempotency
    await tx.insert('sys_idempotency_keys', {
      idempotency_key: input.idempotency_key,
      request_hash: hash(input),
      response_body: order,
      expires_at: new Date(Date.now() + 24 * 3600 * 1000)
    });
    
    // 4. 記錄 audit log
    await this.auditService.log({
      event_type: 'ORDER_CREATED',
      actor_id: actor.userId,
      resource_id: order.id,
      changes: { status: { from: null, to: 'PENDING' } }
    }, tx);
    
    return order;
  });
}
```

§ 5. 禁止事項
❌ 不得修改 orders 表結構
❌ 不得改變現有訂單狀態機

§ 6. 驗收標準
P1. 單次建單成功
```bash
curl -X POST /api/v1/orders \
  -H "Idempotency-Key: test-key-001" \
  -d '{"material_no":"M001","qty":10}'
# 期望: 201 Created
```

P2. 重複建單（相同 payload）回傳快取
```bash
# 重複上面的請求
# 期望: 200 OK，回傳相同 order_id
```

P3. 重複 key 不同 payload 拒絕
```bash
curl -X POST /api/v1/orders \
  -H "Idempotency-Key: test-key-001" \
  -d '{"material_no":"M002","qty":20}'
# 期望: 409 Conflict
```

P4. Audit log 有記錄
```sql
SELECT * FROM sys_audit_logs 
WHERE event_type='ORDER_CREATED' 
ORDER BY created_at DESC LIMIT 1;
-- 期望: 找到剛才建立的記錄
```

§ 7. 回覆契約
請先完成【階段 1：規劃確認】...
````

---

## 📁 建議的檔案結構