-- Add avatar_url column to profiles for agent profile pictures
alter table public.profiles add column if not exists avatar_url text;
