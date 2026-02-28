-- Allow users with dashboard access to an ancestor org to create invites for that org's descendants.
-- Enables root/top-line owners to invite agents directly into subagencies.

CREATE OR REPLACE FUNCTION public.can_invite_to_organization(p_org_id uuid)
RETURNS boolean AS $$
BEGIN
  -- Direct dashboard access to this org
  IF public.has_org_dashboard_access(p_org_id) THEN
    RETURN true;
  END IF;
  -- Dashboard access to an ancestor of this org
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.has_dashboard_access = true
      AND om.status = 'active'
      AND public.is_ancestor_of(om.organization_id, p_org_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Dashboard users can create invites" ON public.organization_invites;
CREATE POLICY "Dashboard users can create invites"
  ON public.organization_invites FOR INSERT
  WITH CHECK (public.can_invite_to_organization(organization_id));

-- RPC for server-side permission check
CREATE OR REPLACE FUNCTION public.can_invite_to_organization_rpc(p_org_id uuid)
RETURNS boolean AS $$
  SELECT public.can_invite_to_organization(p_org_id);
$$ LANGUAGE sql SECURITY DEFINER STABLE;
