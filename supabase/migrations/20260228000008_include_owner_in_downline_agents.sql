-- Include root org owner in downline agents so agency owner production appears in reports
create or replace function public.get_downline_agent_ids(root_org_id uuid)
returns setof uuid as $$
  select om.user_id
  from public.organization_members om
  where om.organization_id in (select public.get_downline_org_ids(root_org_id))
    and om.status = 'active'
    and om.is_producing = true
  union
  select o.owner_id
  from public.organizations o
  where o.id = root_org_id
    and o.owner_id is not null;
$$ language sql security definer stable;
