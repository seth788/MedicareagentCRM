-- Allow agency owners and users with can_view_agency_book to edit clients of agents in their org's downline

-- Helper: true if user can manage this client (own client or has agency book access to client's agent)
create or replace function public.can_manage_client(client_agent_id uuid)
returns boolean as $$
begin
  -- Own client
  if auth.uid() = client_agent_id then
    return true;
  end if;
  -- User has can_view_agency_book on an org whose downline includes client_agent_id
  return exists (
    select 1 from public.organization_members om
    where om.user_id = auth.uid()
      and om.can_view_agency_book = true
      and om.status = 'active'
      and client_agent_id in (select public.get_downline_agent_ids(om.organization_id))
  );
end;
$$ language plpgsql security definer stable;

-- Clients: replace policy to allow agency book managers
drop policy if exists "Agents can manage own clients" on public.clients;
drop policy if exists "Agents and agency book users can manage clients" on public.clients;
create policy "Agents and agency book users can manage clients"
  on public.clients for all
  using (public.can_manage_client(agent_id));

-- Client child tables: allow agency book managers
drop policy if exists "Agents can manage phones of own clients" on public.client_phones;
drop policy if exists "Agents and agency book users can manage phones" on public.client_phones;
create policy "Agents and agency book users can manage phones"
  on public.client_phones for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_id and public.can_manage_client(c.agent_id)
    )
  );

drop policy if exists "Agents can manage emails of own clients" on public.client_emails;
drop policy if exists "Agents and agency book users can manage emails" on public.client_emails;
create policy "Agents and agency book users can manage emails"
  on public.client_emails for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_id and public.can_manage_client(c.agent_id)
    )
  );

drop policy if exists "Agents can manage addresses of own clients" on public.client_addresses;
drop policy if exists "Agents and agency book users can manage addresses" on public.client_addresses;
create policy "Agents and agency book users can manage addresses"
  on public.client_addresses for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_id and public.can_manage_client(c.agent_id)
    )
  );

drop policy if exists "Agents can manage doctors of own clients" on public.client_doctors;
drop policy if exists "Agents and agency book users can manage doctors" on public.client_doctors;
create policy "Agents and agency book users can manage doctors"
  on public.client_doctors for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_id and public.can_manage_client(c.agent_id)
    )
  );

drop policy if exists "Agents can manage medications of own clients" on public.client_medications;
drop policy if exists "Agents and agency book users can manage medications" on public.client_medications;
create policy "Agents and agency book users can manage medications"
  on public.client_medications for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_id and public.can_manage_client(c.agent_id)
    )
  );

drop policy if exists "Agents can manage pharmacies of own clients" on public.client_pharmacies;
drop policy if exists "Agents and agency book users can manage pharmacies" on public.client_pharmacies;
create policy "Agents and agency book users can manage pharmacies"
  on public.client_pharmacies for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_id and public.can_manage_client(c.agent_id)
    )
  );

drop policy if exists "Agents can manage notes of own clients" on public.client_notes;
drop policy if exists "Agents and agency book users can manage notes" on public.client_notes;
create policy "Agents and agency book users can manage notes"
  on public.client_notes for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_id and public.can_manage_client(c.agent_id)
    )
  );

drop policy if exists "Agents can manage coverages of own clients" on public.client_coverages;
drop policy if exists "Agents and agency book users can manage coverages" on public.client_coverages;
create policy "Agents and agency book users can manage coverages"
  on public.client_coverages for all
  using (
    exists (
      select 1 from public.clients c
      where c.id = client_id and public.can_manage_client(c.agent_id)
    )
  );
