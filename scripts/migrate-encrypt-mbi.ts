/**
 * One-time migration: encrypt existing plaintext Medicare numbers (MBI) in the database.
 * Requires ENCRYPTION_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * Run: pnpm exec tsx scripts/migrate-encrypt-mbi.ts [--dry-run]
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { encrypt, isEncrypted } from "../lib/encryption"

function loadEnvLocal() {
  const paths = [resolve(process.cwd(), ".env.local"), resolve(process.cwd(), ".env")]
  for (const p of paths) {
    if (existsSync(p)) {
      const content = readFileSync(p, "utf8")
      for (const line of content.split("\n")) {
        const match = line.match(/^\s*([^#=]+)=(.*)$/)
        if (match) {
          const key = match[1].trim()
          const value = match[2].trim().replace(/^["']|["']$/g, "")
          if (!process.env[key]) process.env[key] = value
        }
      }
      return
    }
  }
}

loadEnvLocal()

const dryRun = process.argv.includes("--dry-run")

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local")
    process.exit(1)
  }
  if (!process.env.ENCRYPTION_KEY) {
    console.error("Missing ENCRYPTION_KEY in .env.local")
    process.exit(1)
  }

  const supabase = createClient(url, serviceRoleKey)
  const { data: rows, error } = await supabase
    .from("clients")
    .select("id, medicare_number")
    .not("medicare_number", "is", null)

  if (error) {
    console.error("Failed to fetch clients:", error.message)
    process.exit(1)
  }

  const toMigrate = (rows ?? []).filter(
    (r) => (r.medicare_number ?? "").trim() !== "" && !isEncrypted(r.medicare_number ?? "")
  )
  console.log(`Found ${toMigrate.length} client(s) with plaintext Medicare numbers to encrypt.`)

  if (toMigrate.length === 0) {
    console.log("Nothing to do.")
    return
  }

  if (dryRun) {
    console.log("[DRY RUN] Would encrypt and update", toMigrate.length, "record(s).")
    return
  }

  let updated = 0
  for (const row of toMigrate) {
    const plain = (row.medicare_number ?? "").trim()
    const encrypted = encrypt(plain)
    const { error: updateError } = await supabase
      .from("clients")
      .update({ medicare_number: encrypted })
      .eq("id", row.id)
    if (updateError) {
      console.error("Failed to update client", row.id, updateError.message)
      continue
    }
    updated++
  }
  console.log("Migrated", updated, "record(s).")
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
