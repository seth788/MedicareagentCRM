-- Add Med Supp as a valid plan_type for client_coverages
alter table public.client_coverages
  drop constraint if exists client_coverages_plan_type_check;

alter table public.client_coverages
  add constraint client_coverages_plan_type_check
  check (plan_type in ('MAPD', 'PDP', 'Med Supp'));
