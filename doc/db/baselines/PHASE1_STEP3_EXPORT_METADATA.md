# PHASE1 Step 3（v2）：匯出最小 E2E 所需資料字典（欄位 / PK / FK）

## 你剛剛遇到的錯誤（已修）
- 之前腳本把 table 名稱拼成：`array['companies'sites'...']`，少了逗號/引號分隔 → 造成 SQL syntax error
- v2 版本已改成正確的 SQL array literal：`array['companies','sites',...]`

## 放置位置
- `scripts/db/06_export_metadata_min_e2e.sh`

## 執行方式
- 先讓腳本可執行（你前面已熟）
- 然後在 repo root 執行此腳本（同你之前跑 04/06 的方式）

## PASS 判準（只看非 0 bytes）
輸出會在：
- `artifacts/inspects/phase1_v1.1/`

必須非空：
- `min_e2e_tables.tsv`
- `min_e2e_columns.tsv`
- `min_e2e_pks.tsv`
- `min_e2e_fks.tsv`

另外會多一個「全 public 表清單」供 sanity：
- `public_tables.tsv`

## 你要回貼什麼（最省 token）
- `ls -lh artifacts/inspects/phase1_v1.1/min_e2e_*.tsv artifacts/inspects/phase1_v1.1/public_tables.tsv`
- `tail -n 80 artifacts/inspects/phase1_v1.1/min_e2e_metadata.export.log`

## 補充：為什麼你剛剛 `psql -c "\dt"` 可能顯示沒表？
- `\dt` 只看 `search_path` 上的 schema；如果你的 role 設定把 `public` 拿掉，就會顯示空。
- 但 DBeaver 直接點 `public` schema 仍能看到表，這是正常現象。
- 我們這次腳本全部用 `information_schema` 指定 `table_schema='public'`，不吃 search_path。
