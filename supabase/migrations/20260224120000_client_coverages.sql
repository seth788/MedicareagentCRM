-- Replace client_coverage (one per client) with client_coverages (multiple plans per client)
drop table if exists public.client_coverage;

create table if not exists public.client_coverages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  plan_type text not null check (plan_type in ('MAPD', 'PDP')),
  company_id uuid,
  carrier text not null default '',
  plan_id uuid,
  plan_name text not null default '',
  status text not null default '',
  application_date date,
  effective_date date not null,
  written_as text,
  election_period text,
  member_policy_number text,
  replacing_coverage_id uuid references public.client_coverages(id) on delete set null,
  application_id text,
  hra_collected boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_client_coverages_client_id on public.client_coverages(client_id);
create index if not exists idx_client_coverages_replacing on public.client_coverages(replacing_coverage_id);

alter table public.client_coverages enable row level security;

create policy "Agents can manage coverages of own clients"
  on public.client_coverages for all using (
    exists (select 1 from public.clients c where c.id = client_id and c.agent_id = auth.uid())
  );
