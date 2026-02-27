import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/resend"
import { fetchSOAById, insertSOAAudit } from "@/lib/db/soa"
import { getAppUrl, soaRequestToClientHtml, soaRequestToClientText } from "@/lib/emails/soa"

const SOA_FROM_EMAIL = "soa@advantacrm.com"

function getErrorMessage(resultError: string): string {
  if (/suppress/i.test(resultError)) {
    return "This email address is suppressed and cannot receive emails. Please contact your administrator."
  }
  return resultError
}

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
    if (!["sent", "opened"].includes(soa.status)) {
      return NextResponse.json(
        { error: "Can only resend SOAs that are sent or opened" },
        { status: 400 }
      )
    }

    const { data: emails } = await supabase
      .from("client_emails")
      .select("value, is_preferred")
      .eq("client_id", soa.clientId)
      .order("is_preferred", { ascending: false })
    const clientEmail = emails?.[0]?.value
    if (!clientEmail) {
      return NextResponse.json(
        { error: "Client has no email on file" },
        { status: 400 }
      )
    }

    const { data: clientRow } = await supabase
      .from("clients")
      .select("first_name")
      .eq("id", soa.clientId)
      .single()

    const appUrl = getAppUrl()
    const signUrl = `${appUrl}/soa/sign/${soa.secureToken}`

    const result = await sendEmail({
      from: SOA_FROM_EMAIL,
      to: [clientEmail],
      subject: "Scope of Appointment — Action Required Before Your Medicare Appointment",
      text: soaRequestToClientText({
        clientFirstName: clientRow?.first_name || "there",
        agentName: soa.agentName,
        agentPhone: soa.agentPhone || "",
        signUrl,
      }),
      html: soaRequestToClientHtml({
        clientFirstName: clientRow?.first_name || "there",
        agentName: soa.agentName,
        agentPhone: soa.agentPhone || "",
        signUrl,
      }),
      fromName: soa.agentName || undefined,
    })

    if (!result.ok) {
      return NextResponse.json(
        { error: getErrorMessage(result.error) },
        { status: 500 }
      )
    }

    await insertSOAAudit(supabase, id, "resent", user.id, null, null, {
      to: clientEmail,
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("SOA resend error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to resend" },
      { status: 500 }
    )
  }
}
