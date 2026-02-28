-- Revert static links: unique invites per email, track status (pending/opened/accepted/revoked)

-- Drop unique constraint if it exists (from static links migration)
ALTER TABLE public.organization_invites
DROP CONSTRAINT IF EXISTS organization_invites_org_role_unique;

-- Add invite email (required for new invites)
ALTER TABLE public.organization_invites
ADD COLUMN IF NOT EXISTS invite_email text;

-- Drop old status check (allowed: active, revoked) BEFORE migrating
ALTER TABLE public.organization_invites
DROP CONSTRAINT IF EXISTS organization_invites_status_check;

-- Migrate status: active -> pending (active meant "valid/usable")
UPDATE public.organization_invites SET status = 'pending' WHERE status = 'active';

-- Add new status check (pending, opened, accepted, revoked)
ALTER TABLE public.organization_invites
ADD CONSTRAINT organization_invites_status_check
CHECK (status IN ('pending', 'opened', 'accepted', 'revoked'));

-- Default for new rows
ALTER TABLE public.organization_invites
ALTER COLUMN status SET DEFAULT 'pending';
