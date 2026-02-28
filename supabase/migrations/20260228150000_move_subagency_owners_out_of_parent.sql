-- One-time fix: remove sub-agency owners from their parent org(s) so they display under their sub-agency.
-- When an agent creates a sub-agency, they should only be a member of that sub-agency.
-- This fixes existing data from before the application logic was updated.
delete from public.organization_members om
where exists (
  select 1
  from public.organizations sub
  where sub.parent_organization_id = om.organization_id
  and sub.owner_id = om.user_id
);
