-- Add client status: active, lead, or inactive (agent-set)
alter table public.clients add column if not exists status text;

-- Backfill: lead if in leads (and no coverage), active if has coverage, else inactive
update public.clients c
set status = 'lead'
where c.status is null
  and exists (select 1 from public.leads l where l.client_id = c.id)
  and not exists (select 1 from public.client_coverages cc where cc.client_id = c.id);

update public.clients c
set status = 'active'
where c.status is null
  and exists (select 1 from public.client_coverages cc where cc.client_id = c.id);

update public.clients c
set status = 'inactive'
where c.status is null;

-- Add check constraint and default for new rows
alter table public.clients drop constraint if exists clients_status_check;
alter table public.clients add constraint clients_status_check
  check (status is null or status in ('active', 'lead', 'inactive'));
alter table public.clients alter column status set default 'active';
