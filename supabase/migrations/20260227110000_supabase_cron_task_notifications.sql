-- Task notification cron via Supabase (pg_cron + pg_net)
-- Runs every minute and calls your app's /api/cron/task-notifications endpoint.
--
-- Setup: After running this migration, update the config in Supabase Dashboard SQL Editor:
--
--   update private.cron_webhook_config set value = 'https://yourapp.vercel.app/api/cron/task-notifications'
--   where key = 'task_notifications_url';
--
--   update private.cron_webhook_config set value = 'your-cron-secret'
--   where key = 'task_notifications_secret';
--
-- (Use your actual app URL and the same CRON_SECRET you have in Vercel env vars.)

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Config table in private schema (not exposed via API; user must update via SQL Editor)
create schema if not exists private;

create table if not exists private.cron_webhook_config (
  key text primary key,
  value text not null
);

-- Seed placeholder values; user updates these for production via SQL Editor
insert into private.cron_webhook_config (key, value) values
  ('task_notifications_url', 'https://your-app.vercel.app/api/cron/task-notifications'),
  ('task_notifications_secret', 'your-cron-secret')
on conflict (key) do nothing;

-- Function that triggers the task-notifications endpoint
create or replace function public.trigger_task_notifications_webhook()
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  target_url text;
  secret_val text;
begin
  select value into target_url from private.cron_webhook_config where key = 'task_notifications_url';
  select value into secret_val from private.cron_webhook_config where key = 'task_notifications_secret';

  if target_url is null or target_url = '' or target_url like '%your-app%' then
    raise log 'Task notifications cron: Skipping - configure task_notifications_url in cron_webhook_config';
    return;
  end if;

  if secret_val is null or secret_val = '' or secret_val = 'your-cron-secret' then
    raise log 'Task notifications cron: Skipping - configure task_notifications_secret in cron_webhook_config';
    return;
  end if;

  perform net.http_get(
    url := target_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret_val),
    timeout_milliseconds := 30000
  );
end;
$$;

-- Schedule: every minute
select cron.schedule(
  'task-notifications-every-minute',
  '* * * * *',
  'select public.trigger_task_notifications_webhook()'
);
