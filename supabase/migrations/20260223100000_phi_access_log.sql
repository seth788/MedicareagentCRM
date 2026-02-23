-- RLS audit summary (existing tables):
-- All tables in 20260222000000_initial_schema.sql have RLS enabled with agent-scoped policies
-- (auth.uid() = agent_id or via client ownership). No additional RLS changes for those tables.
--
-- This migration: creates phi_access_log, adds has_medicare_number to clients, and applies RLS.

-- Optional: computed column so we can list clients without selecting encrypted medicare_number.
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS has_medicare_number boolean
  GENERATED ALWAYS AS (medicare_number IS NOT NULL AND medicare_number <> '') STORED;

CREATE TABLE IF NOT EXISTS public.phi_access_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  field_accessed text not null,
  access_type text not null,
  ip_address text,
  user_agent text,
  accessed_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS idx_phi_access_log_user_id ON public.phi_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_phi_access_log_client_id ON public.phi_access_log(client_id);

ALTER TABLE public.phi_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own phi access logs"
  ON public.phi_access_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own phi access logs"
  ON public.phi_access_log FOR SELECT
  USING (auth.uid() = user_id);
