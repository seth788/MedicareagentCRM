-- Add logo_url column to organizations for agency logo
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS logo_url text;

-- Storage bucket "organization-logos" must be created separately.
-- Run: SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/create-organization-logos-bucket.ts
-- Or create in Dashboard: Storage → New bucket → name: organization-logos, public: true, file size limit: 2MB, allowed: image/jpeg, image/png, image/webp
