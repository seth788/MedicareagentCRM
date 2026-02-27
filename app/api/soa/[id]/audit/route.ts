import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchSOAById, fetchSOAAuditLog } from "@/lib/db/soa"

export async function GET(
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

    const entries = await fetchSOAAuditLog(user.id, id)
    return NextResponse.json({ entries })
  } catch (e) {
    console.error("SOA audit error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to fetch audit" },
      { status: 500 }
    )
  }
}
