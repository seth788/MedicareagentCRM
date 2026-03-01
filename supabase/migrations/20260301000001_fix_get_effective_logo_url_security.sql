-- Fix: get_effective_logo_url must use SECURITY DEFINER so downline users can resolve
-- ancestor logos. RLS blocks them from reading parent/ancestor org rows directly.
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
