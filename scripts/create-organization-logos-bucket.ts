/**
 * One-time script to create the organization-logos storage bucket.
 * Run with: SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/create-organization-logos-bucket.ts
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in env (from Supabase Dashboard → Project Settings → API).
 */
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Set them and run again."
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey)

async function main() {
  const { data, error } = await supabase.storage.createBucket("organization-logos", {
    public: true,
    fileSizeLimit: 2 * 1024 * 1024, // 2MB
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  })

  if (error) {
    if (error.message?.includes("already exists")) {
      console.log("Bucket 'organization-logos' already exists.")
      return
    }
    console.error("Failed to create bucket:", error.message)
    process.exit(1)
  }

  console.log("Bucket 'organization-logos' created successfully.")
}

main()
