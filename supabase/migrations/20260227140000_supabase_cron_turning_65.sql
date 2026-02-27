-- Turning 65 daily digest cron: runs at 6:00 AM UTC.
-- Sends email to agents with turning_65_alerts = true.
--
-- Configure via SQL Editor:
--   update private.cron_webhook_config set value = 'https://yourapp.vercel.app/api/cron/turning-65-alerts'
--   where key = 'turning_65_alerts_url';
-- (Uses same task_notifications_secret for auth.)

insert into private.cron_webhook_config (key, value) values
  ('turning_65_alerts_url', 'https://your-app.vercel.app/api/cron/turning-65-alerts')
on conflict (key) do nothing;

create or replace function public.trigger_turning_65_alerts_webhook()
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  target_url text;
  secret_val text;
begin
  select value into target_url from private.cron_webhook_config where key = 'turning_65_alerts_url';
  select value into secret_val from private.cron_webhook_config where key = 'task_notifications_secret';

  if target_url is null or target_url = '' or target_url like '%your-app%' then
    raise log 'Turning 65 cron: Skipping - configure turning_65_alerts_url in cron_webhook_config';
    return;
  end if;

  if secret_val is null or secret_val = '' or secret_val = 'your-cron-secret' then
    raise log 'Turning 65 cron: Skipping - configure task_notifications_secret in cron_webhook_config';
    return;
  end if;

  perform net.http_get(
    url := target_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || secret_val),
    timeout_milliseconds := 60000
  );
end;
$$;

select cron.schedule(
  'turning-65-alerts-daily',
  '0 6 * * *',
  'select public.trigger_turning_65_alerts_webhook()'
);
