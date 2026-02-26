-- Add 'coverage' activity type for coverage change activities
alter table public.activities drop constraint if exists activities_type_check;
alter table public.activities add constraint activities_type_check
  check (type in ('call', 'email', 'text', 'appointment', 'note', 'coverage'));

-- Migrate existing coverage activities (stored as 'note' with Coverage added/updated/removed descriptions)
update public.activities
set type = 'coverage'
where type = 'note'
  and (
    description like 'Coverage added:%'
    or description like 'Coverage updated:%'
    or description like 'Coverage removed:%'
  );
