-- Per-flow last_touched_at: track when a client was last "touched" within each flow.
-- Touches: stage change, note added, activity logged, added to flow, profile update.

-- Add column (nullable first for backfill, then set not null and default)
alter table public.leads
  add column if not exists last_touched_at timestamptz;

-- Backfill existing rows to their created_at
update public.leads
set last_touched_at = created_at
where last_touched_at is null;

-- Enforce not null and default for new rows
alter table public.leads
  alter column last_touched_at set default now(),
  alter column last_touched_at set not null;

-- Index for sorting flow board by last touched
create index if not exists idx_leads_last_touched_at on public.leads(last_touched_at);

-- Trigger: stage change on a lead → update last_touched_at on that lead row only
create or replace function public.trigger_leads_last_touched_on_stage_change()
returns trigger as $$
begin
  if old.stage_id is distinct from new.stage_id then
    new.last_touched_at := now();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists leads_last_touched_on_stage_change on public.leads;
create trigger leads_last_touched_on_stage_change
  before update on public.leads
  for each row execute function public.trigger_leads_last_touched_on_stage_change();

-- Trigger: note added to client → update last_touched_at on all flow records for that client
create or replace function public.trigger_client_notes_touch_leads()
returns trigger as $$
begin
  update public.leads
  set last_touched_at = now()
  where client_id = new.client_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists client_notes_touch_leads on public.client_notes;
create trigger client_notes_touch_leads
  after insert on public.client_notes
  for each row execute function public.trigger_client_notes_touch_leads();

-- Trigger: activity logged for client or lead → update last_touched_at
-- Client: update all leads for that client; Lead: update that lead row only
create or replace function public.trigger_activities_touch_leads()
returns trigger as $$
begin
  if new.related_type = 'Client' then
    update public.leads
    set last_touched_at = now()
    where client_id = new.related_id;
  elsif new.related_type = 'Lead' then
    update public.leads
    set last_touched_at = now()
    where id = new.related_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists activities_touch_leads on public.activities;
create trigger activities_touch_leads
  after insert on public.activities
  for each row execute function public.trigger_activities_touch_leads();

-- Trigger: client profile updated → update last_touched_at on all flow records for that client
create or replace function public.trigger_clients_touch_leads()
returns trigger as $$
begin
  update public.leads
  set last_touched_at = now()
  where client_id = new.id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists clients_touch_leads on public.clients;
create trigger clients_touch_leads
  after update on public.clients
  for each row execute function public.trigger_clients_touch_leads();
