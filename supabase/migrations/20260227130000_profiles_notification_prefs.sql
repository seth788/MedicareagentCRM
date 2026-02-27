-- Notification preferences: task reminders and turning 65 alerts
alter table public.profiles
  add column if not exists task_reminder_emails boolean not null default true;

alter table public.profiles
  add column if not exists turning_65_alerts boolean not null default true;
