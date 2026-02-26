/**
 * Test script: send a simple email via Resend.
 * Requires RESEND_API_KEY, RESEND_FROM in .env.local.
 * Get an API key at https://resend.com/api-keys
 * Run: npx tsx scripts/test-resend.ts
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { sendEmail } from "../lib/resend"

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

async function main() {
  console.log("Sending test email via Resend...")

  const result = await sendEmail({
    to: ["Seth Clayton <seth@advantacrm.com>"],
    subject: "Hello Seth Clayton",
    text: "Congratulations Seth Clayton, you just sent an email with Resend! You are truly awesome!",
  })

  if (result.ok) {
    console.log("Success! Message ID:", result.id ?? "(no id returned)")
  } else {
    console.error("Failed:", result.error)
    process.exit(1)
  }
}

main()
