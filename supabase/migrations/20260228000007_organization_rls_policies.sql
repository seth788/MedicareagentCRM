-- Step 7: RLS policies for organization tables

-- Helper: has_org_dashboard_access
create or replace function public.has_org_dashboard_access(org_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and has_dashboard_access = true
      and status = 'active'
  );
$$ language sql security definer stable;

-- Helper: user can read org if member or has dashboard in parent (org in downline of orgs they have dashboard access to)
create or replace function public.can_read_organization(p_org_id uuid)
returns boolean as $$
begin
  -- Member of this org
  if exists (select 1 from public.organization_members where organization_id = p_org_id and user_id = auth.uid() and status = 'active') then
    return true;
  end if;
  -- Has dashboard access to a parent org that has this org in downline
  return exists (
    select 1 from public.organization_members om
    join public.organizations o on o.id = om.organization_id
    where om.user_id = auth.uid()
      and om.has_dashboard_access = true
      and om.status = 'active'
      and p_org_id in (select public.get_downline_org_ids(o.id))
  );
end;
$$ language plpgsql security definer stable;

-- organizations policies (can_read_organization takes org id as arg)
create policy "Users can read org if member or has dashboard in parent"
  on public.organizations for select
  using (public.can_read_organization(id));

create policy "Authenticated users can create organizations"
  on public.organizations for insert
  to authenticated
  with check (true);

create policy "Users with dashboard access can update org"
  on public.organizations for update
  using (public.has_org_dashboard_access(id));

create policy "Only owner can delete org"
  on public.organizations for delete
  using (owner_id = auth.uid());

-- organization_members policies
create policy "Dashboard users see all members; others see own row"
  on public.organization_members for select
  using (
    public.has_org_dashboard_access(organization_id)
    or (user_id = auth.uid())
  );

create policy "Dashboard users can add members"
  on public.organization_members for insert
  with check (public.has_org_dashboard_access(organization_id));

create policy "Dashboard users can update members"
  on public.organization_members for update
  using (public.has_org_dashboard_access(organization_id));

create policy "Only owner can remove members"
  on public.organization_members for delete
  using (
    exists (
      select 1 from public.organizations
      where id = organization_id and owner_id = auth.uid()
    )
  );

-- organization_invites policies
create policy "Dashboard users can view invites"
  on public.organization_invites for select
  using (public.has_org_dashboard_access(organization_id));

create policy "Dashboard users can create invites"
  on public.organization_invites for insert
  with check (public.has_org_dashboard_access(organization_id));

create policy "Dashboard users can update invites"
  on public.organization_invites for update
  using (public.has_org_dashboard_access(organization_id));

-- organization_audit_log policies
create policy "Dashboard users can read audit log"
  on public.organization_audit_log for select
  using (public.has_org_dashboard_access(organization_id));

create policy "Authenticated users can insert audit log"
  on public.organization_audit_log for insert
  to authenticated
  with check (true);
