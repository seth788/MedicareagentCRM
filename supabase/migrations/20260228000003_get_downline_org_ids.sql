-- Step 3: get_downline_org_ids function
create or replace function public.get_downline_org_ids(root_org_id uuid)
returns setof uuid as $$
  with recursive downline as (
    select id from public.organizations where id = root_org_id
    union all
    select o.id from public.organizations o
    join downline d on o.parent_organization_id = d.id
  )
  select id from downline;
$$ language sql security definer stable;
