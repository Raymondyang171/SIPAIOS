# PHASE1 Step 3 Debug：為什麼 metadata 匯出全是 0 rows？

你目前的 log 顯示：
- public_tables_rows=0
- tables_found=0
- columns/pks/fks 全 0

這不是「腳本邏輯」問題，而是 **DB 連到的那個 database 目前看不到任何 public tables**。

## A) 先做只讀診斷（必做）
1) 放置檔案：
- scripts/db/07_debug_db_catalog.sh

2) 執行：
- chmod +x scripts/db/07_debug_db_catalog.sh
- ./scripts/db/07_debug_db_catalog.sh

3) 產物：
- artifacts/inspects/phase1_v1.1/db_catalog_debug.txt

## B) 判讀（你只要看一眼）
- 若 [5] count tables per schema 全部為空 / 0
  => 你的 DB 很可能被重建/volume 重置/或你連到不同 database。
- 若 public=0 但其他 schema 有 tables
  => 你的 Phase1 表可能不在 public（下一步改匯出條件即可）。

## C) 如果真的「沒有任何表」（才做 restore）
1) 放置檔案：
- scripts/db/08_restore_latest_phase1_baseline.sh

2) 注意：這是破壞性操作（會 drop 現有物件）
3) 執行：
- chmod +x scripts/db/08_restore_latest_phase1_baseline.sh
- ./scripts/db/08_restore_latest_phase1_baseline.sh

4) restore 後再跑：
- ./scripts/db/06_export_metadata_min_e2e.sh

## 你要回貼給我什麼（最省 token）
- tail -n 200 artifacts/inspects/phase1_v1.1/db_catalog_debug.txt
