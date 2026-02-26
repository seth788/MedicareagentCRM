-- Saved reports: per-agent custom reports that appear in Quick Reports
create table if not exists public.saved_reports (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  filters jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists idx_saved_reports_agent_id on public.saved_reports(agent_id);
alter table public.saved_reports enable row level security;

create policy "Agents can manage own saved reports"
  on public.saved_reports for all using (auth.uid() = agent_id);
