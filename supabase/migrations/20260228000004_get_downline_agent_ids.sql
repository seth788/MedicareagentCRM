-- Step 4: get_downline_agent_ids function
create or replace function public.get_downline_agent_ids(root_org_id uuid)
returns setof uuid as $$
  select om.user_id
  from public.organization_members om
  where om.organization_id in (select public.get_downline_org_ids(root_org_id))
    and om.status = 'active'
    and om.is_producing = true;
$$ language sql security definer stable;
