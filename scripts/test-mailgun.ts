/**
 * Test script: send a simple email via Mailgun.
 * Requires MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM in .env.local.
 * Run: npx tsx scripts/test-mailgun.ts
 */

import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import { sendEmail } from "../lib/mailgun"

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
  console.log("Sending test email via Mailgun...")

  const result = await sendEmail({
    to: ["Seth Clayton <seth@advantacrm.com>"],
    subject: "Hello Seth Clayton",
    text: "Congratulations Seth Clayton, you just sent an email with Mailgun! You are truly awesome!",
  })

  if (result.ok) {
    console.log("Success! Message ID:", result.id ?? "(no id returned)")
  } else {
    console.error("Failed:", result.error)
    process.exit(1)
  }
}

main()
