標題：Stage2C（Tenant Key Scan）Runbook

目的：

用只讀掃描列出 public 表的租戶鍵候選欄位與外鍵關係，作為 RLS tenant scope 的證據。

前置條件：

docker container sipaios-postgres 必須是 healthy

需要以下檔案存在：

phase1_schema_v1.1_sql/supabase/ops/30_stage2c_scan_tenant_keys.sql

執行步驟：

docker exec -i sipaios-postgres psql -U sipaios -d sipaios -f phase1_schema_v1.1_sql/supabase/ops/30_stage2c_scan_tenant_keys.sql

輸出判讀：

1) public table columns：
   - 欄位列表會把 company_id / tenant_id / org_id / site_id 以中括號標記。
   - 透過標記判斷每張表是否存在直接租戶鍵候選欄位。

2) foreign key relationships：
   - 以 table -> referenced table 顯示 FK 關係與欄位對應。
   - 用於建立「沒有直接租戶欄位」的表往上游找租戶表的關聯路徑。

3) tables missing tenant key candidates：
   - 列出完全沒有 company_id / tenant_id / org_id / site_id 的表名。
   - 這些表需要從 FK 關係推導租戶 scope，或補充規則。

成功判準：

三個區塊皆有輸出，且無 SQL error。
