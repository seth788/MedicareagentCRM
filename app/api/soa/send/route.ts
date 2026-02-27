import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/resend"
import { getAppUrl, soaRequestToClientHtml, soaRequestToClientText } from "@/lib/emails/soa"
import { insertSOAAudit } from "@/lib/db/soa"
import type { SOAProduct } from "@/lib/db/soa"

const SOA_FROM_EMAIL = "soa@advantacrm.com"

function getErrorMessage(resultError: string): string {
  if (/suppress/i.test(resultError)) {
    return "This email address is suppressed and cannot receive emails. Please contact your administrator."
  }
  return resultError
}

const INITIAL_CONTACT_METHODS = [
  "Phone",
  "Email",
  "Mail",
  "In-Person/Walk-in",
  "Internet/Website",
  "Referral",
] as const

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
    const {
      clientId,
      email: requestedEmail,
      agentName,
      agentPhone,
      agentNpn,
      language,
      productsPreselected,
      beneficiaryName,
      beneficiaryPhone,
      beneficiaryAddress,
      initialContactMethod,
      appointmentDate,
      deliveryMethod,
    } = body

    if (!clientId || !agentName || !beneficiaryName) {
      return NextResponse.json(
        { error: "clientId, agentName, and beneficiaryName are required" },
        { status: 400 }
      )
    }

    // Validate client belongs to agent
    const { data: clientRow } = await supabase
      .from("clients")
      .select("id, first_name")
      .eq("id", clientId)
      .eq("agent_id", user.id)
      .single()
    if (!clientRow) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    if (deliveryMethod === "email") {
      const { data: emails } = await supabase
        .from("client_emails")
        .select("value, is_preferred")
        .eq("client_id", clientId)
        .order("is_preferred", { ascending: false })
      if (!emails?.length) {
        return NextResponse.json(
          { error: "Client has no email address on file" },
          { status: 400 }
        )
      }
      const clientEmail = requestedEmail
        ? emails.find((e) => e.value === requestedEmail)?.value
        : emails[0]?.value
      if (!clientEmail) {
        return NextResponse.json(
          { error: requestedEmail ? "Selected email is not on file for this client" : "Client has no email address on file" },
          { status: 400 }
        )
      }

      const tokenExpiresAt = new Date()
      tokenExpiresAt.setHours(tokenExpiresAt.getHours() + 72)

      const products = Array.isArray(productsPreselected)
        ? (productsPreselected as SOAProduct[]).filter((p) =>
            ["part_d", "part_c", "dental_vision_hearing", "hospital_indemnity", "medigap"].includes(p)
          )
        : []

      const secureToken = crypto.randomUUID()
      const appUrl = getAppUrl()
      const signUrl = `${appUrl}/soa/sign/${secureToken}`

      const fromName = `${agentName}`.trim()
      const result = await sendEmail({
        from: SOA_FROM_EMAIL,
        to: [clientEmail],
        subject: "Scope of Appointment — Action Required Before Your Medicare Appointment",
        text: soaRequestToClientText({
          clientFirstName: clientRow.first_name || "there",
          agentName: String(agentName),
          agentPhone: String(agentPhone || ""),
          signUrl,
        }),
        html: soaRequestToClientHtml({
          clientFirstName: clientRow.first_name || "there",
          agentName: String(agentName),
          agentPhone: String(agentPhone || ""),
          signUrl,
        }),
        fromName: fromName || undefined,
      })

      if (!result.ok) {
        return NextResponse.json(
          { error: getErrorMessage(result.error) },
          { status: 500 }
        )
      }

      const { data: soaRow, error: insertError } = await supabase
        .from("scope_of_appointments")
        .insert({
          agent_id: user.id,
          client_id: clientId,
          status: "sent",
          delivery_method: "email",
          secure_token: secureToken,
          token_expires_at: tokenExpiresAt.toISOString(),
          language: language === "es" ? "es" : "en",
          products_preselected: products,
          products_selected: [],
          agent_name: String(agentName).trim(),
          agent_phone: agentPhone ? String(agentPhone).trim() : null,
          agent_npn: agentNpn ? String(agentNpn).trim() : null,
          beneficiary_name: String(beneficiaryName).trim(),
          beneficiary_phone: beneficiaryPhone ? String(beneficiaryPhone).trim() : null,
          beneficiary_address: beneficiaryAddress ? String(beneficiaryAddress).trim() : null,
          initial_contact_method: INITIAL_CONTACT_METHODS.includes(initialContactMethod)
            ? initialContactMethod
            : null,
          appointment_date: appointmentDate || null,
        })
        .select("*")
        .single()

      if (insertError) {
        console.error("SOA insert error:", insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      await insertSOAAudit(supabase, soaRow.id, "created", user.id)
      await insertSOAAudit(supabase, soaRow.id, "sent", user.id, null, null, {
        delivery_method: "email",
        to: clientEmail,
      })

      const mapRow = (r: Record<string, unknown>) => ({
        id: r.id,
        agentId: r.agent_id,
        clientId: r.client_id,
        status: r.status,
        secureToken: r.secure_token,
        tokenExpiresAt: r.token_expires_at,
        signUrl,
      })

      return NextResponse.json({
        soa: mapRow(soaRow),
        signUrl,
      })
    }

    return NextResponse.json(
      { error: "Only email delivery is supported for MVP" },
      { status: 400 }
    )
  } catch (e) {
    console.error("SOA send error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to send SOA" },
      { status: 500 }
    )
  }
}
