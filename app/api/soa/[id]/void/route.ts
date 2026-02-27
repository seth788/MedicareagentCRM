import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchSOAById, insertSOAAudit } from "@/lib/db/soa"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const soa = await fetchSOAById(user.id, id)
    if (!soa) {
      return NextResponse.json({ error: "SOA not found" }, { status: 404 })
    }
    if (["completed", "expired", "voided"].includes(soa.status)) {
      return NextResponse.json(
        { error: `Cannot void SOA with status: ${soa.status}` },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from("scope_of_appointments")
      .update({
        status: "voided",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("agent_id", user.id)

    if (error) {
      console.error("SOA void error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await insertSOAAudit(supabase, id, "voided", user.id)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("SOA void error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to void SOA" },
      { status: 500 }
    )
  }
}
