-- Storage RLS policies for organization-logos bucket.
-- Org owners can insert/update/delete logos in their org folder (org_id/logo-*.ext).
-- Service role bypasses RLS; these policies enable list/remove when needed.
CREATE POLICY "Org owners can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = (SELECT id FROM storage.buckets WHERE name = 'organization-logos' LIMIT 1)
  AND EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id::text = (storage.foldername(name))[1]
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Org owners can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = (SELECT id FROM storage.buckets WHERE name = 'organization-logos' LIMIT 1)
  AND EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id::text = (storage.foldername(name))[1]
    AND owner_id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = (SELECT id FROM storage.buckets WHERE name = 'organization-logos' LIMIT 1)
  AND EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id::text = (storage.foldername(name))[1]
    AND owner_id = auth.uid()
  )
);

CREATE POLICY "Org owners can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = (SELECT id FROM storage.buckets WHERE name = 'organization-logos' LIMIT 1)
  AND EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id::text = (storage.foldername(name))[1]
    AND owner_id = auth.uid()
  )
);

-- Public read: bucket is public so logo URLs work without signed URLs
CREATE POLICY "Public read organization logos"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = (SELECT id FROM storage.buckets WHERE name = 'organization-logos' LIMIT 1)
);
