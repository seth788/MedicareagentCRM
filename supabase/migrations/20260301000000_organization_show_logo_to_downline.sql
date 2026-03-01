-- Add show_logo_to_downline toggle to organizations
-- When true (default), the agency's logo displays to all downline agents and agencies.
-- Sub-agencies with their own logo can toggle this to show theirs or fall back to upline.
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS show_logo_to_downline boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.organizations.show_logo_to_downline IS 'When true and org has a logo, display it to downline. Sub-agencies without a logo inherit upline logo when upline has this enabled.';

-- Function: get effective logo URL for an org (walks up ancestry, first with logo + show_logo_to_downline)
-- SECURITY DEFINER: downline users cannot read ancestor orgs via RLS; we need to resolve logo for them
CREATE OR REPLACE FUNCTION public.get_effective_logo_url(p_org_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT o.logo_url
  FROM public.organization_ancestry oa
  JOIN public.organizations o ON o.id = oa.ancestor_id
  WHERE oa.org_id = p_org_id
    AND o.logo_url IS NOT NULL
    AND o.show_logo_to_downline = true
  ORDER BY oa.depth ASC
  LIMIT 1;
$$;
