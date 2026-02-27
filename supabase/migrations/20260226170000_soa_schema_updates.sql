-- SOA schema updates: remove carrier_template and plans_represented; add profile phone; audit INSERT policy

-- 1. Add phone to profiles for agent phone pre-fill in Send SOA modal
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Remove carrier_template — single CMS template only, not carrier-specific
ALTER TABLE public.scope_of_appointments
  DROP COLUMN IF EXISTS carrier_template;

-- 3. Remove plans_represented — not needed per spec
ALTER TABLE public.scope_of_appointments
  DROP COLUMN IF EXISTS plans_represented;

-- 4. Allow agents to insert audit log entries for their own SOAs
CREATE POLICY "Agents can insert audit logs for own SOAs" ON public.soa_audit_log
  FOR INSERT
  WITH CHECK (
    soa_id IN (SELECT id FROM public.scope_of_appointments WHERE agent_id = auth.uid())
  );
