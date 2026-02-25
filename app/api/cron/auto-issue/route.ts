import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { runAutoIssueCron } from "@/lib/db/coverages"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error("CRON_SECRET is not set")
    return NextResponse.json({ error: "Cron not configured" }, { status: 500 })
  }
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const supabase = createServiceRoleClient()
    const result = await runAutoIssueCron(supabase)
    return NextResponse.json({
      ok: true,
      processed: result.processed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (e) {
    console.error("Auto-issue cron failed:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 }
    )
  }
}
