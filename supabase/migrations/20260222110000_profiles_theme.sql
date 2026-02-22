-- Add theme to profiles if not already present (e.g. if 20260222100000 was run before theme was added)
alter table public.profiles
  add column if not exists theme text default 'light';

alter table public.profiles drop constraint if exists profiles_theme_check;
alter table public.profiles add constraint profiles_theme_check check (theme in ('light', 'dark', 'system'));
