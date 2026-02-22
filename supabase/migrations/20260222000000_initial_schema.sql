-- MediCRM: profiles, flows, stages (per-agent), clients + child tables, leads, activities, tasks, agent_custom_sources
-- Run in Supabase Dashboard SQL Editor or via: supabase db push

-- Profiles: one per auth user
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Flows: per-agent (each agent has their own flows)
create table if not exists public.flows (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  "order" int not null default 0,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_flows_agent_id on public.flows(agent_id);
alter table public.flows enable row level security;

create policy "Agents can manage own flows"
  on public.flows for all using (auth.uid() = agent_id);

-- Stages: belong to a flow (flow is per-agent)
create table if not exists public.stages (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.flows(id) on delete cascade,
  name text not null,
  "order" int not null default 0,
  color_key text
);

create index if not exists idx_stages_flow_id on public.stages(flow_id);
alter table public.stages enable row level security;

create policy "Agents can manage stages of own flows"
  on public.stages for all using (
    exists (select 1 from public.flows f where f.id = flow_id and f.agent_id = auth.uid())
  );

-- Clients: per-agent
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null,
  last_name text not null,
  title text,
  middle_name text,
  suffix text,
  nickname text,
  gender text check (gender in ('M', 'F')),
  fun_facts text,
  dob text not null,
  turning65_date text not null,
  preferred_contact_method text not null check (preferred_contact_method in ('phone', 'email', 'text')),
  language text not null default 'English',
  spouse_id uuid references public.clients(id) on delete set null,
  medicare_number text,
  part_a_effective_date text,
  part_b_effective_date text,
  source text,
  allergies text[] default '{}',
  conditions text[] default '{}',
  health_tracker text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_clients_agent_id on public.clients(agent_id);
alter table public.clients enable row level security;

create policy "Agents can manage own clients"
  on public.clients for all using (auth.uid() = agent_id);

-- Client child tables
create table if not exists public.client_phones (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  number text not null,
  type text not null check (type in ('Cell', 'Home', 'Work', 'Other')),
  is_preferred boolean not null default false,
  note text
);
create index if not exists idx_client_phones_client_id on public.client_phones(client_id);
alter table public.client_phones enable row level security;
create policy "Agents can manage phones of own clients"
  on public.client_phones for all using (
    exists (select 1 from public.clients c where c.id = client_id and c.agent_id = auth.uid())
  );

create table if not exists public.client_emails (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  value text not null,
  is_preferred boolean not null default false,
  note text
);
create index if not exists idx_client_emails_client_id on public.client_emails(client_id);
alter table public.client_emails enable row level security;
create policy "Agents can manage emails of own clients"
  on public.client_emails for all using (
    exists (select 1 from public.clients c where c.id = client_id and c.agent_id = auth.uid())
  );

create table if not exists public.client_addresses (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  type text not null check (type in ('Home', 'Mailing', 'Secondary Home', 'Secondary Mailing')),
  address text not null,
  unit text,
  city text not null,
  state text not null,
  zip text not null,
  is_preferred boolean not null default false
);
create index if not exists idx_client_addresses_client_id on public.client_addresses(client_id);
alter table public.client_addresses enable row level security;
create policy "Agents can manage addresses of own clients"
  on public.client_addresses for all using (
    exists (select 1 from public.clients c where c.id = client_id and c.agent_id = auth.uid())
  );

create table if not exists public.client_doctors (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  specialty text not null,
  phone text,
  first_name text,
  last_name text,
  provider_id text,
  facility_address text,
  importance text check (importance in ('essential', 'preferred', 'flexible')),
  note text
);
create index if not exists idx_client_doctors_client_id on public.client_doctors(client_id);
alter table public.client_doctors enable row level security;
create policy "Agents can manage doctors of own clients"
  on public.client_doctors for all using (
    exists (select 1 from public.clients c where c.id = client_id and c.agent_id = auth.uid())
  );

create table if not exists public.client_medications (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  dosage text,
  frequency text not null,
  quantity int,
  notes text,
  first_prescribed text,
  rxcui text,
  drug_name text,
  dosage_display text,
  dose_form text,
  is_package_drug boolean default false,
  package_description text,
  package_ndc text,
  brand_name text
);
create index if not exists idx_client_medications_client_id on public.client_medications(client_id);
alter table public.client_medications enable row level security;
create policy "Agents can manage medications of own clients"
  on public.client_medications for all using (
    exists (select 1 from public.clients c where c.id = client_id and c.agent_id = auth.uid())
  );

create table if not exists public.client_pharmacies (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  phone text,
  address text
);
create index if not exists idx_client_pharmacies_client_id on public.client_pharmacies(client_id);
alter table public.client_pharmacies enable row level security;
create policy "Agents can manage pharmacies of own clients"
  on public.client_pharmacies for all using (
    exists (select 1 from public.clients c where c.id = client_id and c.agent_id = auth.uid())
  );

create table if not exists public.client_notes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists idx_client_notes_client_id on public.client_notes(client_id);
alter table public.client_notes enable row level security;
create policy "Agents can manage notes of own clients"
  on public.client_notes for all using (
    exists (select 1 from public.clients c where c.id = client_id and c.agent_id = auth.uid())
  );

create table if not exists public.client_coverage (
  client_id uuid primary key references public.clients(id) on delete cascade,
  plan_type text not null check (plan_type in ('MA', 'MAPD', 'PDP', 'Supp')),
  carrier text not null,
  plan_name text not null,
  effective_date text not null,
  application_id text not null,
  premium numeric not null default 0,
  last_review_date text not null
);
alter table public.client_coverage enable row level security;
create policy "Agents can manage coverage of own clients"
  on public.client_coverage for all using (
    exists (select 1 from public.clients c where c.id = client_id and c.agent_id = auth.uid())
  );

-- Leads: per-agent; flow_id/stage_id reference flows/stages (which are per-agent)
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references auth.users(id) on delete cascade,
  assigned_to_agent_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  flow_id uuid not null references public.flows(id) on delete restrict,
  stage_id uuid not null references public.stages(id) on delete restrict,
  first_name text not null,
  last_name text not null,
  phone text not null default '',
  email text not null default '',
  source text not null check (source in ('Facebook', 'Referral', 'Website', 'Call-in', 'Direct Mail', 'Event')),
  notes jsonb not null default '[]',
  tags text[] not null default '{}',
  next_follow_up_at timestamptz,
  dob text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_leads_agent_id on public.leads(agent_id);
create index if not exists idx_leads_flow_stage on public.leads(flow_id, stage_id);
alter table public.leads enable row level security;

create policy "Agents can manage own leads"
  on public.leads for all using (auth.uid() = agent_id);

-- Activities: per-agent
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references auth.users(id) on delete cascade,
  created_by_agent_id uuid not null references auth.users(id) on delete cascade,
  related_type text not null check (related_type in ('Lead', 'Client')),
  related_id uuid not null,
  type text not null check (type in ('call', 'email', 'text', 'appointment', 'note')),
  description text not null,
  outcome text,
  due_date timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_activities_agent_id on public.activities(agent_id);
create index if not exists idx_activities_related on public.activities(related_type, related_id);
alter table public.activities enable row level security;

create policy "Agents can manage own activities"
  on public.activities for all using (auth.uid() = agent_id);

-- Tasks: per-agent
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references auth.users(id) on delete cascade,
  related_type text not null check (related_type in ('Lead', 'Client')),
  related_id uuid not null,
  related_name text not null,
  title text not null,
  description text,
  due_date timestamptz not null,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_tasks_agent_id on public.tasks(agent_id);
create index if not exists idx_tasks_related on public.tasks(related_type, related_id);
alter table public.tasks enable row level security;

create policy "Agents can manage own tasks"
  on public.tasks for all using (auth.uid() = agent_id);

-- Agent custom sources: per-agent
create table if not exists public.agent_custom_sources (
  agent_id uuid not null references auth.users(id) on delete cascade,
  source text not null,
  primary key (agent_id, source)
);

alter table public.agent_custom_sources enable row level security;

create policy "Agents can manage own custom sources"
  on public.agent_custom_sources for all using (auth.uid() = agent_id);
