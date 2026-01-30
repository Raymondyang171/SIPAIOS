BEGIN;

-- Purpose: Make demo UOMs visible to the demo tenant.
-- Reason: RLS policy uoms_company_isolation requires company_id IS NOT NULL
--         and is_tenant_member(company_id, auth.uid()).
-- Demo tenant/company_id:
--   9b8444cb-d8cb-58d7-8322-22d5c95892a1

UPDATE uoms
SET company_id = '9b8444cb-d8cb-58d7-8322-22d5c95892a1'
WHERE company_id IS NULL;

-- Quick check
SELECT code, name, company_id
FROM uoms
ORDER BY code;

COMMIT;
