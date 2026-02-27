-- Track when task reminder emails have been sent so we don't send duplicates
alter table public.tasks add column if not exists notification_sent_at timestamptz;
