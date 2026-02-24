alter table public.client_addresses
add column if not exists county text;
