-- Add auto_issue_applications to profiles for pending-to-issued workflow
alter table public.profiles
  add column if not exists auto_issue_applications boolean not null default true;
