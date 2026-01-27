標題：Stage2B（RBAC/RLS 最小閉環）一鍵重播 Runbook

目的：

建立租戶/使用者/RBAC/RLS 最小閉環

驗收錨點：跨 tenant 讀寫必拒（PASS）

前置條件：

docker container sipaios-postgres 必須是 healthy

需要以下檔案存在：

phase1_schema_v1.1_sql/supabase/ops/10_stage2b_rbac_rls.sql

phase1_schema_v1.1_sql/supabase/ops/20_stage2b_seed_rbac.sql

phase1_schema_v1.1_sql/supabase/ops/99_stage2b_verify_rbac_rls.sql

scripts/db/01_replay_stage2b_rbac_v1_0.sh

執行步驟：

chmod +x scripts/db/01_replay_stage2b_rbac_v1_0.sh

./scripts/db/01_replay_stage2b_rbac_v1_0.sh

成功判準（驗收錨點）：

verify_phase1=PASS

verify_stage2b=PASS

結尾顯示 [OK] Stage2B replay finished

回滾：

回到 Phase1 v1.1：執行 scripts/db/00_replay_phase1_v1_1.sh

常見問題：

若遇到 permission denied：確認 Stage2B 已包含必要 GRANT，且 verify 使用 service_role 路徑

若 claims/sub 缺失：verify 必須 set request.jwt.claims 才能讓 auth.uid() 回傳
