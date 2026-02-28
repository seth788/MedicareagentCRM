-- Allow users to read profiles of org members they share client visibility with
-- (so LOA agents can see admin names on notes, admins can see agent names, etc.)

create or replace function public.can_read_profile_for_display(target_id uuid)
returns boolean as $$
begin
  -- Own profile
  if auth.uid() = target_id then
    return true;
  end if;
  -- Current user has can_view_agency_book and target is in their org's downline
  if exists (
    select 1 from public.organization_members om
    where om.user_id = auth.uid()
      and om.can_view_agency_book = true
      and om.status = 'active'
      and target_id in (select public.get_downline_agent_ids(om.organization_id))
  ) then
    return true;
  end if;
  -- Target has can_view_agency_book and current user is in their org's downline
  -- (LOA agent reading admin/owner profile)
  if exists (
    select 1 from public.organization_members om
    where om.user_id = target_id
      and om.can_view_agency_book = true
      and om.status = 'active'
      and auth.uid() in (select public.get_downline_agent_ids(om.organization_id))
  ) then
    return true;
  end if;
  return false;
end;
$$ language plpgsql security definer stable;

drop policy if exists "Users can read profiles within org visibility" on public.profiles;
create policy "Users can read profiles within org visibility"
  on public.profiles for select
  using (public.can_read_profile_for_display(id));
