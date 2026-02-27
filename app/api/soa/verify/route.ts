import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { getSOAByToken, insertSOAAudit } from "@/lib/db/soa"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get("token")
  if (!token) {
    return NextResponse.json(
      { error: "Token is required", valid: false },
      { status: 400 }
    )
  }
  return handleVerify(token)
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const token = body.token ?? req.headers.get("x-soa-token")
    if (!token) {
      return NextResponse.json(
        { error: "Token is required", valid: false },
        { status: 400 }
      )
    }
    return handleVerify(token)
  } catch {
    return NextResponse.json(
      { error: "Invalid request", valid: false },
      { status: 400 }
    )
  }
}

async function handleVerify(token: string) {
  try {
    const supabase = createServiceRoleClient()

    const soa = await getSOAByToken(supabase, token)
    if (!soa) {
      return NextResponse.json(
        {
          error: "This link is invalid or has expired. Please contact your agent for a new link.",
          valid: false,
        },
        { status: 404 }
      )
    }

    const now = new Date()
    const expiresAt = new Date(soa.tokenExpiresAt)
    if (expiresAt < now) {
      await supabase
        .from("scope_of_appointments")
        .update({
          status: "expired",
          updated_at: now.toISOString(),
        })
        .eq("id", soa.id)
      await insertSOAAudit(supabase, soa.id, "expired", "system")
      return NextResponse.json(
        {
          error: "This link has expired. Please contact your agent for a new link.",
          valid: false,
        },
        { status: 410 }
      )
    }

    if (!["sent", "opened"].includes(soa.status)) {
      return NextResponse.json(
        {
          error:
            soa.status === "client_signed"
              ? "This form has already been signed."
              : "This link is no longer valid.",
          valid: false,
        },
        { status: 400 }
      )
    }

    if (soa.status === "sent") {
      await supabase
        .from("scope_of_appointments")
        .update({
          status: "opened",
          updated_at: now.toISOString(),
        })
        .eq("id", soa.id)
      await insertSOAAudit(supabase, soa.id, "opened", "client")
    }

    return NextResponse.json({
      valid: true,
      soa: {
        id: soa.id,
        beneficiaryName: soa.beneficiaryName,
        agentName: soa.agentName,
        agentPhone: soa.agentPhone,
        productsPreselected: soa.productsPreselected,
        language: soa.language,
      },
    })
  } catch (e) {
    console.error("SOA verify error:", e)
    return NextResponse.json(
      {
        error: "Something went wrong. Please try again or contact your agent.",
        valid: false,
      },
      { status: 500 }
    )
  }
}
