-- Add organization_id to saved_reports for agency-scoped reports.
-- null = personal/CRM report, non-null = agency report for that org.
alter table public.saved_reports
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade;

create index if not exists idx_saved_reports_org_agent
  on public.saved_reports(organization_id, agent_id)
  where organization_id is not null;

-- RLS: agents can manage reports where they own it and (org is null for personal, or they have access to org for agency)
-- Existing policy covers agent_id. For org-scoped, we need the user to have dashboard access to the org.
drop policy if exists "Agents can manage own saved reports" on public.saved_reports;

create policy "Agents can manage own saved reports"
  on public.saved_reports for all
  using (
    auth.uid() = agent_id
    and (
      organization_id is null
      or exists (
        select 1 from public.organization_members om
        where om.organization_id = saved_reports.organization_id
          and om.user_id = auth.uid()
          and om.status = 'active'
          and om.has_dashboard_access = true
      )
    )
  );
