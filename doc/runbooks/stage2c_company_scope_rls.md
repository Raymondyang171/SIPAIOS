標題：Stage2C-1（Company Scope RLS）Runbook

SVC：SVC-2C-1-COMPANY-RLS

目的：

針對 public schema 落地 company isolation RLS。
authenticated 只能存取自己 company；service_role 允許跨 company。

前置條件：

docker container sipaios-postgres 必須是 healthy

需要以下檔案存在：

phase1_schema_v1.1_sql/supabase/ops/40_stage2c_company_scope_rls.sql
phase1_schema_v1.1_sql/supabase/ops/99_stage2c_verify_company_scope_rls.sql
scripts/db/02_replay_stage2c_company_scope_v1_0.sh

怎麼重播：

chmod +x scripts/db/02_replay_stage2c_company_scope_v1_0.sh
./scripts/db/02_replay_stage2c_company_scope_v1_0.sh

PASS 判準：

Stage2B replay finished
Stage2C-1 replay finished
且 verify 無 SQL error

證據位置（Artifacts）：

每次執行會在 artifacts/replay/stage2c_1/<timestamp>/ 產生：

- 01_init.log：初始化資訊 + Stage2B baseline 執行記錄
- 02_apply.log：40_stage2c_company_scope_rls.sql 執行記錄（若該步驟執行到）
- 03_verify.log：99_stage2c_verify_company_scope_rls.sql 執行記錄（若該步驟執行到）
- 04_summary.txt：摘要（必定產生，無論成功或失敗）

04_summary.txt 格式：

成功時包含：
- stage2c_1=PASS
- verify_cross_company_denied=PASS
- verify_same_company_allowed=PASS
- timestamp_utc / db_container / db_name / ops_dir / run_dir

失敗時包含：
- stage2c_1=FAIL
- error=<錯誤訊息>
- failed_step=<失敗步驟（init / stage2b_replay / apply_rls / verify_rls / parse_results）>
- timestamp_utc / db_container / db_name / ops_dir / run_dir

查看最新執行結果：

ls -lt artifacts/replay/stage2c_1/ | head
cat artifacts/replay/stage2c_1/<timestamp>/04_summary.txt
grep -E "PASS|FAIL|stage2c" artifacts/replay/stage2c_1/<timestamp>/*.txt

驗收重點（對應 verify）：

1) 建兩家公司 A/B + userA/userB + memberships
2) 插入 A/B 的 items / uoms / sales_orders(+lines) / purchase_orders(+lines)
3) userA 無法讀/寫 B；userB 無法讀/寫 A
4) service_role 可讀到 A+B

常見錯誤排查：

- permission denied：確認容器 healthy，且已跑過 Stage2B（會建立 roles + auth.uid() shim）
- auth.uid() 為 NULL：確認 verify 已 set request.jwt.claims
- uoms 看不到：Stage2C-1 允許 uoms.company_id 為 NULL，但 authenticated 不能看到 NULL rows

後續待辦（Stage2C-2）：

將 uoms.company_id 補齊並收斂到 NOT NULL，視需求調整唯一鍵（例如 company_id + code）。
