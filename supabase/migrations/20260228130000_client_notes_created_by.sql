-- Add created_by to client_notes so we know who wrote each note

ALTER TABLE public.client_notes
ADD COLUMN IF NOT EXISTS created_by uuid references auth.users(id) on delete set null;

-- Backfill: existing notes get null (unknown author)
