import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { logPhiAccess } from "@/lib/db/phi-access-log"

/**
 * POST /api/reports/export
 * Logs PHI export access for each client ID. Does not accept or return PHI.
 * Call before client-side CSV generation.
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const clientIds = body?.clientIds as string[] | undefined
    if (!Array.isArray(clientIds) || clientIds.length === 0) {
      return NextResponse.json({ error: "clientIds required" }, { status: 400 })
    }

    for (const clientId of clientIds) {
      if (typeof clientId === "string" && clientId) {
        await logPhiAccess({
          userId: user.id,
          clientId,
          fieldAccessed: "report_export",
          accessType: "export",
        })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[reports/export]", e)
    return NextResponse.json({ error: "Export log failed" }, { status: 500 })
  }
}
