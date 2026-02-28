-- Street-level agents: agency sees reports only (no contact info)
-- LOA/Community: agency sees full book (agency_can_view_book = true)
-- Set agency_can_view_book = false for agent role (street-level)
UPDATE public.organization_members
SET agency_can_view_book = false
WHERE role = 'agent';

-- RLS for subagency_creation_requests
-- Requesting user and top-line dashboard users can read requests
DROP POLICY IF EXISTS "Users and top-line can read subagency requests" ON public.subagency_creation_requests;
CREATE POLICY "Users and top-line can read subagency requests"
  ON public.subagency_creation_requests FOR SELECT
  USING (
    requesting_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.has_dashboard_access = true
        AND om.status = 'active'
        AND om.organization_id = subagency_creation_requests.root_organization_id
    )
  );

DROP POLICY IF EXISTS "Street-level agents can create subagency requests" ON public.subagency_creation_requests;
CREATE POLICY "Street-level agents can create subagency requests"
  ON public.subagency_creation_requests FOR INSERT
  WITH CHECK (
    requesting_user_id = auth.uid()
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.organization_members om
      JOIN public.organizations o ON o.id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.role IN ('agent', 'agency')
        AND om.status = 'active'
        AND (COALESCE(o.root_organization_id, o.id) = root_organization_id
             OR o.id = root_organization_id)
    )
  );

DROP POLICY IF EXISTS "Top-line can update subagency requests" ON public.subagency_creation_requests;
CREATE POLICY "Top-line can update subagency requests"
  ON public.subagency_creation_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.has_dashboard_access = true
        AND om.status = 'active'
        AND om.organization_id = subagency_creation_requests.root_organization_id
    )
  );
