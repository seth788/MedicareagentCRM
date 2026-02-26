import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import {
  fetchSavedReports,
  insertSavedReport,
  type SavedReportFilter,
} from "@/lib/db/saved-reports"
import type { ReportFilterField } from "@/lib/report-filters"

/** GET /api/saved-reports - List saved reports for the current agent. */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const reports = await fetchSavedReports(user.id)
    return NextResponse.json(reports)
  } catch (e) {
    console.error("[saved-reports GET]", e)
    return NextResponse.json(
      { error: "Failed to fetch saved reports" },
      { status: 500 }
    )
  }
}

/** POST /api/saved-reports - Save a new report. */
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
    const name = typeof body?.name === "string" ? body.name.trim() : ""
    const filtersRaw = body?.filters

    if (!name) {
      return NextResponse.json(
        { error: "Report name is required" },
        { status: 400 }
      )
    }

    if (!Array.isArray(filtersRaw) || filtersRaw.length === 0) {
      return NextResponse.json(
        { error: "At least one filter is required" },
        { status: 400 }
      )
    }

    const filters: SavedReportFilter[] = filtersRaw
      .map((f: unknown) => {
        if (
          f &&
          typeof f === "object" &&
          "field" in f &&
          typeof (f as { field: unknown }).field === "string" &&
          "value" in f &&
          typeof (f as { value: unknown }).value === "string"
        ) {
          const obj = f as { field: string; value: string; valueTo?: string }
          return {
            field: obj.field as ReportFilterField,
            value: obj.value,
            valueTo: typeof obj.valueTo === "string" ? obj.valueTo : undefined,
          }
        }
        return null
      })
      .filter((f): f is SavedReportFilter => f !== null)

    if (filters.length === 0) {
      return NextResponse.json(
        { error: "Valid filters are required" },
        { status: 400 }
      )
    }

    const report = await insertSavedReport(user.id, name, filters)
    return NextResponse.json(report)
  } catch (e) {
    console.error("[saved-reports POST]", e)
    return NextResponse.json(
      { error: "Failed to save report" },
      { status: 500 }
    )
  }
}
