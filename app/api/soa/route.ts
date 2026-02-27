import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchSOAsForClient } from "@/lib/db/soa"

export async function GET(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get("clientId")
    if (!clientId) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 }
      )
    }

    const soas = await fetchSOAsForClient(user.id, clientId)
    return NextResponse.json({ soas })
  } catch (e) {
    console.error("SOA list error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch SOAs" },
      { status: 500 }
    )
  }
}
