import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { sendEmail } from "@/lib/resend"
import { getSOAByToken, insertSOAAudit } from "@/lib/db/soa"
import { getAppUrl, soaAgentNotificationHtml, soaAgentNotificationText } from "@/lib/emails/soa"
import type { SOAProduct } from "@/lib/db/soa"

const VALID_PRODUCTS: SOAProduct[] = [
  "part_d",
  "part_c",
  "dental_vision_hearing",
  "hospital_indemnity",
  "medigap",
]

function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null
  return null
}

function getUserAgent(req: Request): string | null {
  return req.headers.get("user-agent")
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      token,
      typedSignature,
      productsSelected,
      signerType,
      repName,
      repRelationship,
    } = body

    if (!token || !typedSignature?.trim()) {
      return NextResponse.json(
        { error: "Token and typed signature are required" },
        { status: 400 }
      )
    }

    const products = Array.isArray(productsSelected)
      ? (productsSelected as string[]).filter((p) => VALID_PRODUCTS.includes(p as SOAProduct))
      : []

    const supabase = createServiceRoleClient()
    const soa = await getSOAByToken(supabase, token)
    if (!soa) {
      return NextResponse.json(
        { error: "Invalid or expired link" },
        { status: 404 }
      )
    }

    const now = new Date()
    const expiresAt = new Date(soa.tokenExpiresAt)
    if (expiresAt < now) {
      return NextResponse.json(
        { error: "This link has expired" },
        { status: 410 }
      )
    }

    if (!["sent", "opened"].includes(soa.status)) {
      return NextResponse.json(
        { error: "This form has already been signed" },
        { status: 400 }
      )
    }

    const ip = getClientIp(req)
    const userAgent = getUserAgent(req)

    const { error: updateError } = await supabase
      .from("scope_of_appointments")
      .update({
        status: "client_signed",
        client_typed_signature: typedSignature.trim(),
        products_selected: products,
        signer_type: signerType === "representative" ? "representative" : "beneficiary",
        rep_name: signerType === "representative" ? (repName ?? null) : null,
        rep_relationship: signerType === "representative" ? (repRelationship ?? null) : null,
        client_signed_at: now.toISOString(),
        client_ip_address: ip,
        client_user_agent: userAgent,
        updated_at: now.toISOString(),
      })
      .eq("id", soa.id)

    if (updateError) {
      console.error("SOA client-sign update error:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    await insertSOAAudit(supabase, soa.id, "client_signed", "client", ip, userAgent, {
      products_selected: products,
      signer_type: signerType,
    })

    // Fetch agent email from auth
    const { data: agentUser } = await supabase.auth.admin.getUserById(soa.agentId)
    const agentEmail = agentUser?.user?.email
    if (agentEmail) {
      const appUrl = getAppUrl()
      const profileUrl = `${appUrl}/clients/${soa.clientId}?section=soa`

      const productLabels: Record<string, string> = {
        part_d: "Part D (PDP)",
        part_c: "Part C (MAPD)",
        dental_vision_hearing: "Dental/Vision/Hearing",
        hospital_indemnity: "Hospital Indemnity",
        medigap: "Medigap",
      }
      const labels = products.map((p) => productLabels[p] ?? p)
      const signedAtStr = now.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })

      await sendEmail({
        from: "soa@advantacrm.com",
        to: [agentEmail],
        subject: `SOA Signed — ${soa.beneficiaryName} is ready for your countersignature`,
        fromName: "AdvantaCRM",
        text: soaAgentNotificationText({
          clientName: soa.beneficiaryName,
          productsSelected: labels,
          signedAt: signedAtStr,
          profileUrl,
        }),
        html: soaAgentNotificationHtml({
          clientName: soa.beneficiaryName,
          productsSelected: labels,
          signedAt: signedAtStr,
          profileUrl,
        }),
      })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("SOA client-sign error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to submit signature" },
      { status: 500 }
    )
  }
}
