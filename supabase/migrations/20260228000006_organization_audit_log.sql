-- Step 6: organization_audit_log table
create table if not exists public.organization_audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  action text not null,
  target_user_id uuid references auth.users(id) on delete set null,
  performed_by uuid not null references auth.users(id) on delete cascade,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_organization_audit_log_org on public.organization_audit_log(organization_id);
create index if not exists idx_organization_audit_log_created on public.organization_audit_log(created_at);

alter table public.organization_audit_log enable row level security;
