-- Migration: Add password_hash column to sys_users
-- Purpose: Enable local authentication for API skeleton

BEGIN;

-- Add password_hash column if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'sys_users'
      AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE public.sys_users ADD COLUMN password_hash text;
  END IF;
END $$;

COMMIT;
