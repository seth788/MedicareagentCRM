import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { deleteSavedReport } from "@/lib/db/saved-reports"

/** DELETE /api/saved-reports/[id] - Delete a saved report. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json(
        { error: "Report ID is required" },
        { status: 400 }
      )
    }

    await deleteSavedReport(user.id, id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error("[saved-reports DELETE]", e)
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500 }
    )
  }
}
