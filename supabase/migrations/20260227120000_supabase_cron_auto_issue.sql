-- Auto-issue cron: move pending coverages to Active when effective date has passed.
-- Only for agents with auto_issue_applications = true (saved in Settings).
-- Runs daily at 1:00 AM UTC (same schedule as former Vercel cron).

create extension if not exists pg_cron with schema pg_catalog;

create or replace function public.run_auto_issue_cron()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.client_coverages cc
  set
    status = case cc.status
      when 'Pending (not agent of record)' then 'Active (not agent of record)'
      else 'Active'
    end,
    commission_status = 'paid_full',
    updated_at = now()
  from public.clients c
  join public.profiles p on p.id = c.agent_id and p.auto_issue_applications = true
  where cc.client_id = c.id
    and cc.status in ('Pending/Submitted', 'Pending (not agent of record)')
    and cc.effective_date <= current_date;
end;
$$;

-- Daily at 1:00 AM UTC
select cron.schedule(
  'auto-issue-daily',
  '0 1 * * *',
  'select public.run_auto_issue_cron()'
);
