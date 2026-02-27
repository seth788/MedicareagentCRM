/**
 * One-time script to create the soa-documents storage bucket for signed SOA PDFs.
 * Run with: SUPABASE_SERVICE_ROLE_KEY=xxx npx tsx scripts/create-soa-bucket.ts
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
  const { data, error } = await supabase.storage.createBucket("soa-documents", {
    public: false,
    fileSizeLimit: 5 * 1024 * 1024, // 5MB per PDF
    allowedMimeTypes: ["application/pdf"],
  })

  if (error) {
    if (error.message?.includes("already exists")) {
      console.log("Bucket 'soa-documents' already exists.")
      return
    }
    console.error("Failed to create bucket:", error.message)
    process.exit(1)
  }

  console.log("Bucket 'soa-documents' created successfully.")
}

main()
