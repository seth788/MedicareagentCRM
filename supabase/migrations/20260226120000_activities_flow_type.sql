-- Add 'flow' activity type for flow/stage activities (moved, added, removed)
alter table public.activities drop constraint if exists activities_type_check;
alter table public.activities add constraint activities_type_check
  check (type in ('call', 'email', 'text', 'appointment', 'note', 'coverage', 'flow'));

-- Migrate existing flow/stage activities (stored as 'note')
update public.activities
set type = 'flow'
where type = 'note'
  and (
    (description like 'Moved to %' and description like '% in %')
    or description like 'Added to % (stage: %'
    or description like 'Added to % — Stage: %'
    or description like 'Removed from "%" Flow'
  );
