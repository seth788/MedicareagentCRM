import { NextResponse } from "next/server"
import { createClient, createServiceRoleClient } from "@/lib/supabase/server"
import { fetchSOAById } from "@/lib/db/soa"
import { generateSignedSOAPDF } from "@/lib/soa/generate-pdf"

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

    let soa = await fetchSOAById(user.id, id)
    if (!soa) {
      return NextResponse.json({ error: "SOA not found" }, { status: 404 })
    }
    if (soa.status !== "completed") {
      return NextResponse.json(
        { error: "PDF is only available for completed SOAs" },
        { status: 400 }
      )
    }

    if (!soa.signedPdfPath) {
      const result = await generateSignedSOAPDF(soa)
      if (result.error) {
        return NextResponse.json(
          { error: result.error || "Failed to generate PDF" },
          { status: 500 }
        )
      }
      soa = await fetchSOAById(user.id, id)
      if (!soa?.signedPdfPath) {
        return NextResponse.json(
          { error: "PDF generation completed but file is not available" },
          { status: 500 }
        )
      }
    }

    const storage = createServiceRoleClient().storage
    const { data, error } = await storage
      .from("soa-documents")
      .createSignedUrl(soa.signedPdfPath, 3600) // 1 hour

    if (error) {
      console.error("Signed URL error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ url: data.signedUrl })
  } catch (e) {
    console.error("SOA signed-url error:", e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to get URL" },
      { status: 500 }
    )
  }
}
