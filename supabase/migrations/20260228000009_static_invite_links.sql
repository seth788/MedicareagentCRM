-- Static invite links: one per org+role

-- Remove duplicates, keeping oldest per (organization_id, role)
WITH keep AS (
  SELECT DISTINCT ON (organization_id, role) id
  FROM public.organization_invites
  ORDER BY organization_id, role, created_at ASC
)
DELETE FROM public.organization_invites
WHERE id NOT IN (SELECT id FROM keep);

-- Enforce one invite per org per role
ALTER TABLE public.organization_invites
ADD CONSTRAINT organization_invites_org_role_unique UNIQUE (organization_id, role);

-- Backfill: create static invites for existing orgs missing them
DO $$
DECLARE
  org_rec RECORD;
  role_val text;
  roles_arr text[] := ARRAY['agent', 'loa_agent', 'community_agent', 'agency', 'staff'];
BEGIN
  FOR org_rec IN SELECT id, owner_id FROM public.organizations
  LOOP
    FOREACH role_val IN ARRAY roles_arr
    LOOP
      INSERT INTO public.organization_invites (organization_id, role, invite_token, created_by)
      SELECT org_rec.id, role_val
        , rtrim(translate(encode(gen_random_bytes(32), 'base64'), '+/', '-_'), '=')
        , org_rec.owner_id
      WHERE NOT EXISTS (
        SELECT 1 FROM public.organization_invites
        WHERE organization_id = org_rec.id AND role = role_val
      );
    END LOOP;
  END LOOP;
END $$;
