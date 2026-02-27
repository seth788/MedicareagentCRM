-- Step 5: organization_invites table
create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null check (role in ('agent', 'loa_agent', 'community_agent', 'agency', 'staff')),
  invite_token text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz,
  max_uses integer,
  times_used integer not null default 0,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now()
);

create index if not exists idx_organization_invites_token on public.organization_invites(invite_token);
create index if not exists idx_organization_invites_org on public.organization_invites(organization_id);

alter table public.organization_invites enable row level security;
