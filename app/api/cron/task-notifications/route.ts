import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { runTaskNotificationsCron, debugTaskNotifications } from "@/lib/db/task-notifications"

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

  const url = new URL(request.url)
  const dryRun = url.searchParams.get("dry_run") === "1"

  try {
    const supabase = createServiceRoleClient()
    if (dryRun) {
      const debug = await debugTaskNotifications(supabase)
      return NextResponse.json({ ok: true, dryRun: true, ...debug })
    }
    const result = await runTaskNotificationsCron(supabase)
    return NextResponse.json({
      ok: true,
      sent: result.sent,
      errors: result.errors.length > 0 ? result.errors : undefined,
    })
  } catch (e) {
    console.error("Task notifications cron failed:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron failed" },
      { status: 500 }
    )
  }
}
