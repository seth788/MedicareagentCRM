import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchSOAById, insertSOAAudit } from "@/lib/db/soa"
import { generateSignedSOAPDF } from "@/lib/soa/generate-pdf"

const INITIAL_CONTACT_METHODS = [
  "Phone",
  "Email",
  "Mail",
  "In-Person/Walk-in",
  "Internet/Website",
  "Referral",
] as const

export async function PATCH(
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
    if (soa.status !== "completed") {
      return NextResponse.json(
        { error: "Only completed SOAs can be edited" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { agentName, appointmentDate, initialContactMethod } = body

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    const metadata: Record<string, { before: unknown; after: unknown }> = {}

    if (agentName !== undefined) {
      const before = soa.agentName
      const after = String(agentName).trim()
      if (before !== after) {
        updates.agent_name = after || null
        metadata.agent_name = { before, after }
      }
    }
    if (appointmentDate !== undefined) {
      const before = soa.appointmentDate
      const after = appointmentDate ? String(appointmentDate).slice(0, 10) : null
      if (before !== after) {
        updates.appointment_date = after
        metadata.appointment_date = { before, after }
      }
    }
    if (initialContactMethod !== undefined) {
      const before = soa.initialContactMethod
      const after = INITIAL_CONTACT_METHODS.includes(initialContactMethod)
        ? initialContactMethod
        : null
      if (before !== after) {
        updates.initial_contact_method = after
        metadata.initial_contact_method = { before, after }
      }
    }

    const keys = Object.keys(updates).filter((k) => k !== "updated_at")
    if (keys.length === 0) {
      return NextResponse.json({ soa })
    }

    const { error } = await supabase
      .from("scope_of_appointments")
      .update(updates)
      .eq("id", id)
      .eq("agent_id", user.id)

    if (error) {
      console.error("SOA edit error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await insertSOAAudit(supabase, id, "edited", user.id, null, null, {
      fields_changed: metadata,
    })

    const updatedSoa = await fetchSOAById(user.id, id)
    if (updatedSoa) {
      const pdfResult = await generateSignedSOAPDF(updatedSoa)
      if (pdfResult.error) {
        console.error("PDF re-generation failed:", pdfResult.error)
        const final = await fetchSOAById(user.id, id)
        return NextResponse.json({
          soa: final,
          warning: `Saved, but PDF could not be updated: ${pdfResult.error}`,
        })
      }
    }

    const final = await fetchSOAById(user.id, id)
    return NextResponse.json({ soa: final })
  } catch (e) {
    console.error("SOA edit error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to edit SOA" },
      { status: 500 }
    )
  }
}
