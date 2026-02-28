-- LOA and Community agents cannot create or own subagencies — enforce at DB level
CREATE OR REPLACE FUNCTION public.check_subagency_owner_not_loa_community()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_organization_id IS NOT NULL AND NEW.owner_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE user_id = NEW.owner_id
        AND status = 'active'
        AND role IN ('loa_agent', 'community_agent')
    ) THEN
      RAISE EXCEPTION 'LOA and community agents cannot create or own subagencies';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_subagency_owner_trigger ON public.organizations;
CREATE TRIGGER check_subagency_owner_trigger
  BEFORE INSERT OR UPDATE OF owner_id, parent_organization_id ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.check_subagency_owner_not_loa_community();
