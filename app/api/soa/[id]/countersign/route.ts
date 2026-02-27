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
    if (soa.status !== "client_signed") {
      return NextResponse.json(
        { error: "SOA must be in client_signed status to countersign" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { typedSignature, initialContactMethod, appointmentDate } = body
    if (!typedSignature?.trim()) {
      return NextResponse.json(
        { error: "Typed signature is required" },
        { status: 400 }
      )
    }

    const now = new Date()
    const updates: Record<string, unknown> = {
      status: "completed",
      agent_typed_signature: typedSignature.trim(),
      agent_signed_at: now.toISOString(),
      updated_at: now.toISOString(),
    }
    if (initialContactMethod != null) updates.initial_contact_method = initialContactMethod
    if (appointmentDate != null) updates.appointment_date = appointmentDate || null

    const { error } = await supabase
      .from("scope_of_appointments")
      .update(updates)
      .eq("id", id)
      .eq("agent_id", user.id)

    if (error) {
      console.error("SOA countersign error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    await insertSOAAudit(supabase, id, "agent_countersigned", user.id)

    // Generate PDF
    const { generateSignedSOAPDF } = await import("@/lib/soa/generate-pdf")
    const updatedSoa = await fetchSOAById(user.id, id)
    if (updatedSoa) {
      const result = await generateSignedSOAPDF(updatedSoa)
      if (result.error) {
        console.error("PDF generation failed after countersign:", result.error)
      }
    }

    const { data: updated } = await supabase
      .from("scope_of_appointments")
      .select("*")
      .eq("id", id)
      .single()

    const mapRow = (r: Record<string, unknown>) => ({
      id: r.id,
      status: r.status,
      agentTypedSignature: r.agent_typed_signature,
      agentSignedAt: r.agent_signed_at,
      signedPdfPath: r.signed_pdf_path,
    })

    return NextResponse.json({
      soa: mapRow(updated ?? {}),
    })
  } catch (e) {
    console.error("SOA countersign error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to countersign" },
      { status: 500 }
    )
  }
}
