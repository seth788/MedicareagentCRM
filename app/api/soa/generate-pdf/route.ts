import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { fetchSOAById } from "@/lib/db/soa"
import { generateSignedSOAPDF } from "@/lib/soa/generate-pdf"

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const soaId = body.soaId
    if (!soaId) {
      return NextResponse.json(
        { error: "soaId is required" },
        { status: 400 }
      )
    }

    const soa = await fetchSOAById(user.id, soaId)
    if (!soa) {
      return NextResponse.json({ error: "SOA not found" }, { status: 404 })
    }
    if (soa.status !== "completed") {
      return NextResponse.json(
        { error: "PDF can only be generated for completed SOAs" },
        { status: 400 }
      )
    }

    const result = await generateSignedSOAPDF(soa)
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ signedPdfPath: result.path })
  } catch (e) {
    console.error("generate-pdf error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "PDF generation failed" },
      { status: 500 }
    )
  }
}
