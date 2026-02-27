-- Add Med Supp / PDP specific fields to client_coverages
alter table public.client_coverages add column if not exists premium numeric;
alter table public.client_coverages add column if not exists bonus numeric;
alter table public.client_coverages add column if not exists billing_method text;
alter table public.client_coverages add column if not exists draft_day text;
alter table public.client_coverages add column if not exists enrollment_method text;
alter table public.client_coverages add column if not exists new_to_book_or_rewrite text;
