# APP-005 Purchase UI Runbook

## Scope
- Purchase Order Detail
- Purchase Order Create (Items dropdown)

## Known Symptoms
- PO Detail crashes on unit price display
- Create PO items list is empty or fails to load

## Troubleshooting: Items List Empty
1) Check API response in browser DevTools
   - Network: `/api/items?type=fg,rm`
   - Expected: 200 with `items` array

2) If 401/403
   - Confirm `auth_token` cookie exists
   - Confirm API proxy is pointing to correct `NEXT_PUBLIC_API_BASE_URL`

3) If 200 but `items` is empty
   - Verify DB has item seed data (FG/RM)
   - Verify item scope: `items.company_id` matches current company
   - Verify `item_type` values match expected `FG`/`RM` (case-insensitive)

4) If request never reaches API
   - Check web dev server and API server are both running
   - Check proxy route `apps/web/app/api/items/route.ts`

## Notes
- `unit_price` may be string/null; UI must format defensively.
