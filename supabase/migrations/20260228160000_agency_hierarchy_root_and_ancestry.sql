-- Agency hierarchy: root_organization_id and ancestry closure table
-- Enables fast ancestor checks for hierarchical reporting visibility

-- Add root_organization_id to organizations (null = top-line, self-reference)
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS root_organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Backfill: set root for existing rows (walk parent chain)
UPDATE public.organizations o
SET root_organization_id = (
  WITH RECURSIVE up AS (
    SELECT id, parent_organization_id FROM public.organizations WHERE id = o.id
    UNION ALL
    SELECT p.id, p.parent_organization_id
    FROM public.organizations p
    JOIN up u ON p.id = u.parent_organization_id
  )
  SELECT id FROM up WHERE parent_organization_id IS NULL LIMIT 1
)
WHERE o.root_organization_id IS NULL;

-- For top-line orgs (parent is null), root = self
UPDATE public.organizations
SET root_organization_id = id
WHERE parent_organization_id IS NULL AND (root_organization_id IS NULL OR root_organization_id != id);

CREATE INDEX IF NOT EXISTS idx_organizations_root ON public.organizations(root_organization_id);

-- Ancestry closure table: (org_id, ancestor_id, depth) for efficient ancestor checks
CREATE TABLE IF NOT EXISTS public.organization_ancestry (
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  ancestor_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  depth int NOT NULL CHECK (depth >= 0),
  PRIMARY KEY (org_id, ancestor_id)
);

CREATE INDEX IF NOT EXISTS idx_org_ancestry_ancestor ON public.organization_ancestry(ancestor_id);
CREATE INDEX IF NOT EXISTS idx_org_ancestry_org ON public.organization_ancestry(org_id);

-- Populate ancestry for existing data (org_id, ancestor_id, depth)
INSERT INTO public.organization_ancestry (org_id, ancestor_id, depth)
WITH RECURSIVE tree AS (
  SELECT id AS org_id, id AS ancestor_id, 0 AS depth
  FROM public.organizations
  UNION ALL
  SELECT t.org_id, o.parent_organization_id, t.depth + 1
  FROM tree t
  JOIN public.organizations o ON o.id = t.ancestor_id
  WHERE o.parent_organization_id IS NOT NULL
)
SELECT org_id, ancestor_id, depth FROM tree
ON CONFLICT (org_id, ancestor_id) DO NOTHING;

-- Trigger to maintain root_organization_id on insert/update
CREATE OR REPLACE FUNCTION public.sync_organization_root()
RETURNS TRIGGER AS $$
DECLARE
  new_root uuid;
BEGIN
  IF NEW.parent_organization_id IS NULL THEN
    NEW.root_organization_id := NEW.id;
  ELSE
    SELECT root_organization_id INTO new_root
    FROM public.organizations WHERE id = NEW.parent_organization_id;
    NEW.root_organization_id := COALESCE(new_root, NEW.parent_organization_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_org_root_trigger ON public.organizations;
CREATE TRIGGER sync_org_root_trigger
  BEFORE INSERT OR UPDATE OF parent_organization_id ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.sync_organization_root();

-- Trigger to maintain ancestry (runs AFTER insert/update so row exists)
CREATE OR REPLACE FUNCTION public.sync_organization_ancestry()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.organization_ancestry WHERE org_id = NEW.id;
  INSERT INTO public.organization_ancestry (org_id, ancestor_id, depth)
  WITH RECURSIVE path AS (
    SELECT id, parent_organization_id, 0 AS d
    FROM public.organizations WHERE id = NEW.id
    UNION ALL
    SELECT p.id, p.parent_organization_id, path.d + 1
    FROM public.organizations p
    JOIN path ON p.id = path.parent_organization_id
  )
  SELECT NEW.id, id, d FROM path;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_org_ancestry_trigger ON public.organizations;
CREATE TRIGGER sync_org_ancestry_trigger
  AFTER INSERT OR UPDATE OF parent_organization_id ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.sync_organization_ancestry();
