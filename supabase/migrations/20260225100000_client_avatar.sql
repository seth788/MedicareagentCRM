-- Add image_url column to clients for avatar/profile photo
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS image_url text;

-- Storage bucket "client-avatars" must be created separately. Run:
--   SUPABASE_SERVICE_ROLE_KEY=xxx pnpm create:avatar-bucket
-- Or create in Dashboard: Storage → New bucket → name: client-avatars, public: true, file size limit: 2MB, allowed: image/jpeg, image/png, image/webp

-- RLS policies for storage.objects: agents can only upload/update/delete
-- to paths under their own agent_id (first folder = auth.uid())
CREATE POLICY "Agents can upload client avatars to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = (SELECT id FROM storage.buckets WHERE name = 'client-avatars' LIMIT 1)
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Agents can update own client avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = (SELECT id FROM storage.buckets WHERE name = 'client-avatars' LIMIT 1)
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = (SELECT id FROM storage.buckets WHERE name = 'client-avatars' LIMIT 1)
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Agents can delete own client avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = (SELECT id FROM storage.buckets WHERE name = 'client-avatars' LIMIT 1)
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read: bucket is public so avatar URLs work without signed URLs
-- (avatars are non-sensitive profile photos)
