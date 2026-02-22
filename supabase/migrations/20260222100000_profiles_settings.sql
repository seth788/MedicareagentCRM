-- Add profile fields for settings page (first name, last name, NPN, theme)
alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists npn text,
  add column if not exists theme text default 'light' check (theme in ('light', 'dark', 'system'));

-- Backfill display_name from first_name + last_name where we have them (optional)
-- update public.profiles set display_name = trim(concat(first_name, ' ', last_name)) where first_name is not null or last_name is not null;
