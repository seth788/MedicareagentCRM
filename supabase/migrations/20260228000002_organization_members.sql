-- Step 2: organization_members table
create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'agent', 'loa_agent', 'community_agent', 'agency', 'staff')),
  has_dashboard_access boolean not null default false,
  can_view_agency_book boolean not null default false,
  agency_can_view_book boolean not null default true,
  is_producing boolean not null default true,
  status text not null default 'active' check (status in ('pending', 'active', 'inactive')),
  invited_at timestamptz default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists idx_organization_members_user on public.organization_members(user_id);
create index if not exists idx_organization_members_org on public.organization_members(organization_id);
create index if not exists idx_organization_members_status on public.organization_members(status);

alter table public.organization_members enable row level security;
