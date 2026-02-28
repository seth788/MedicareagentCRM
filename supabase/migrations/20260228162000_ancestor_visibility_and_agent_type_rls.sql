-- Helper: true if p_ancestor is an ancestor of p_org (or self)
CREATE OR REPLACE FUNCTION public.is_ancestor_of(p_ancestor uuid, p_org uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_ancestry oa
    WHERE oa.org_id = p_org AND oa.ancestor_id = p_ancestor
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Update get_downline_org_ids to use root_organization_id when available for efficiency
-- Keep existing implementation for compatibility; add optional ancestry-based variant if needed
-- get_downline_org_ids already works via recursive CTE

-- Update can_manage_client: agency users with can_view_agency_book get access only if
-- 1) Agent is in their downline (ancestor check), AND
-- 2) For full access: agent's agency_can_view_book = true (LOA/community)
--    For limited access: agency_can_view_book = false (street-level) - we allow SELECT on limited columns via view/API
-- RLS grants row access; column filtering for street-level happens in application/views

-- Revised can_manage_client: check ancestor relationship (requesting org must be ancestor of agent's org)
CREATE OR REPLACE FUNCTION public.can_manage_client(client_agent_id uuid)
RETURNS boolean AS $$
DECLARE
  agent_org_id uuid;
  agent_role text;
  agent_agency_can_view boolean;
BEGIN
  IF auth.uid() = client_agent_id THEN
    RETURN true;
  END IF;

  -- Get agent's org and role
  SELECT om.organization_id, om.role, om.agency_can_view_book
  INTO agent_org_id, agent_role, agent_agency_can_view
  FROM public.organization_members om
  WHERE om.user_id = client_agent_id AND om.status = 'active'
  LIMIT 1;

  IF agent_org_id IS NULL THEN
    RETURN false;
  END IF;

  -- User has can_view_agency_book on an org that is an ancestor of the agent's org
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.can_view_agency_book = true
      AND om.status = 'active'
      AND public.is_ancestor_of(om.organization_id, agent_org_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- can_view_client_contact_info: true if requester owns client OR has full agency book access (LOA/community agents)
-- Used by API/views to decide whether to expose phone, email, address, MBI
CREATE OR REPLACE FUNCTION public.can_view_client_contact_info(client_agent_id uuid)
RETURNS boolean AS $$
DECLARE
  agent_org_id uuid;
  agent_agency_can_view boolean;
BEGIN
  IF auth.uid() = client_agent_id THEN
    RETURN true;
  END IF;

  SELECT om.organization_id, om.agency_can_view_book
  INTO agent_org_id, agent_agency_can_view
  FROM public.organization_members om
  WHERE om.user_id = client_agent_id AND om.status = 'active'
  LIMIT 1;

  IF agent_org_id IS NULL THEN
    RETURN false;
  END IF;

  -- Agency gets full access only when agency_can_view_book = true (LOA/community)
  IF agent_agency_can_view = false THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = auth.uid()
      AND om.can_view_agency_book = true
      AND om.status = 'active'
      AND public.is_ancestor_of(om.organization_id, agent_org_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Update get_downline_agent_ids to support ancestor-based filtering for a specific requesting org
-- (so Subagency 1 only sees agents in their subtree, not siblings)
-- Existing get_downline_agent_ids(root_org_id) returns all agents under root - that's correct for root.
-- For a non-root org, we need agents where this org is an ancestor.
CREATE OR REPLACE FUNCTION public.get_downline_agent_ids(root_org_id uuid)
RETURNS setof uuid AS $$
  SELECT om.user_id
  FROM public.organization_members om
  WHERE om.organization_id IN (SELECT public.get_downline_org_ids(root_org_id))
    AND om.status = 'active'
    AND om.is_producing = true
  UNION
  SELECT o.owner_id
  FROM public.organizations o
  WHERE o.id = root_org_id
    AND o.owner_id IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Add get_agent_ids_under_org: agents for whom org_id is an ancestor (hierarchical visibility)
CREATE OR REPLACE FUNCTION public.get_agent_ids_under_org(org_id uuid)
RETURNS setof uuid AS $$
  SELECT om.user_id
  FROM public.organization_members om
  WHERE public.is_ancestor_of(org_id, om.organization_id)
    AND om.status = 'active'
    AND om.is_producing = true
  UNION
  SELECT o.owner_id
  FROM public.organizations o
  WHERE o.id = org_id AND o.owner_id IS NOT NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
