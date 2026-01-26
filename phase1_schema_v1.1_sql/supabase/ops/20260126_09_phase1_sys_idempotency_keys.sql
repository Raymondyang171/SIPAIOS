BEGIN;

-- Phase 1 platform baseline: idempotency keys (API write de-dup)
-- Design notes:
-- - scope: logical namespace for keys (default 'global').
-- - company_id: optional foreign key to companies; useful when you later support multi-company.
-- - expires_at: enables periodic cleanup (retention).
CREATE TABLE IF NOT EXISTS public.sys_idempotency_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  scope text NOT NULL DEFAULT 'global',
  company_id uuid NULL REFERENCES public.companies(id) ON DELETE CASCADE,

  idempotency_key text NOT NULL,
  request_fingerprint text,
  request_body jsonb,

  response_status integer,
  response_body jsonb,
  status text NOT NULL DEFAULT 'created',

  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),

  expires_at timestamptz,
  locked_at timestamptz,
  locked_by text
);

-- Uniqueness gate: prevents duplicate writes for the same scope + key
CREATE UNIQUE INDEX IF NOT EXISTS sys_idempotency_keys_scope_key_uq
  ON public.sys_idempotency_keys (scope, idempotency_key);

-- Helpful indexes for operations / cleanup
CREATE INDEX IF NOT EXISTS sys_idempotency_keys_company_id_idx
  ON public.sys_idempotency_keys (company_id);

CREATE INDEX IF NOT EXISTS sys_idempotency_keys_expires_at_idx
  ON public.sys_idempotency_keys (expires_at);

CREATE INDEX IF NOT EXISTS sys_idempotency_keys_last_seen_at_idx
  ON public.sys_idempotency_keys (last_seen_at);

COMMIT;
