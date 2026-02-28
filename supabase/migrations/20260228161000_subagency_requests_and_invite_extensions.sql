-- Subagency creation requests: street-level agents request, top-line agency approves
CREATE TABLE IF NOT EXISTS public.subagency_creation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  root_organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  placement_parent_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_subagency_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subagency_requests_root ON public.subagency_creation_requests(root_organization_id);
CREATE INDEX IF NOT EXISTS idx_subagency_requests_requesting ON public.subagency_creation_requests(requesting_user_id);
CREATE INDEX IF NOT EXISTS idx_subagency_requests_status ON public.subagency_creation_requests(status);

ALTER TABLE public.subagency_creation_requests ENABLE ROW LEVEL SECURITY;

-- Invite extensions: invite_type (agent_join vs subagency_creation), target_organization_id for placement
ALTER TABLE public.organization_invites
ADD COLUMN IF NOT EXISTS invite_type text DEFAULT 'agent_join' CHECK (invite_type IN ('agent_join', 'subagency_creation'));

ALTER TABLE public.organization_invites
ADD COLUMN IF NOT EXISTS target_organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- For agent_join: target_organization_id = org where agent will be placed (can be org or any descendant for top-line)
-- For subagency_creation: target_organization_id = parent under which subagency will be created
-- organization_id on invite = root org for subagency_creation (top-line that sent invite)
ALTER TABLE public.organization_invites
ADD COLUMN IF NOT EXISTS subagency_name text;

CREATE INDEX IF NOT EXISTS idx_organization_invites_target ON public.organization_invites(target_organization_id);

-- Link subagency requests to invites (when approved, an invite is sent)
ALTER TABLE public.subagency_creation_requests
ADD COLUMN IF NOT EXISTS invite_id uuid REFERENCES public.organization_invites(id) ON DELETE SET NULL;
