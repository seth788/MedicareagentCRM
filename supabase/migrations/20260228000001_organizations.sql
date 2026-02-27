-- Step 1: organizations table
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_organization_id uuid references public.organizations(id) on delete set null,
  organization_type text not null check (organization_type in ('fmo', 'agency', 'sub_agency')),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_organizations_parent on public.organizations(parent_organization_id);
create index if not exists idx_organizations_owner on public.organizations(owner_id);

create or replace function public.organizations_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function public.organizations_updated_at();

alter table public.organizations enable row level security;
