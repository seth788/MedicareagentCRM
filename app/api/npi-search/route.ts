import { NextRequest, NextResponse } from "next/server"
import {
  normalizeNPIResult,
  filterByFacilityName,
  type NPIResultDTO,
} from "@/lib/npi"

const NPI_BASE = "https://npiregistry.cms.hhs.gov/api/"

interface NPIResponse {
  result_count?: number
  results?: Record<string, unknown>[]
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const city = searchParams.get("city")?.trim()
  const state = searchParams.get("state")?.trim()
  const taxonomy_description = searchParams.get("taxonomy_description")?.trim()
  const last_name = searchParams.get("last_name")?.trim()
  const facility_name = searchParams.get("facility_name")?.trim()

  if (!city || !state || !taxonomy_description) {
    return NextResponse.json(
      { error: "city, state, and taxonomy_description are required" },
      { status: 400 }
    )
  }

  if (state.length !== 2) {
    return NextResponse.json(
      { error: "state must be 2 characters" },
      { status: 400 }
    )
  }

  const taxonomiesToFetch =
    taxonomy_description === "Family Medicine"
      ? ["Family Medicine", "Nurse Practitioner"]
      : [taxonomy_description]

  const seenNpis = new Set<string>()
  let normalized: NPIResultDTO[] = []

  /** Fetch one enumeration type (NPI-1 individuals or NPI-2 organizations) for one taxonomy */
  const fetchTaxonomy = async (
    tax: string,
    enumerationType: "NPI-1" | "NPI-2"
  ): Promise<Record<string, unknown>[]> => {
    const params = new URLSearchParams({
      version: "2.1",
      enumeration_type: enumerationType,
      city,
      state,
      taxonomy_description: tax,
      limit: "200",
    })
    if (last_name && enumerationType === "NPI-1") params.set("last_name", last_name)

    const url = `${NPI_BASE}?${params.toString()}`
    const res = await fetch(url, { next: { revalidate: 0 } })
    if (!res.ok) return []
    const data = (await res.json()) as NPIResponse
    return data.results ?? []
  }

  try {
    for (const tax of taxonomiesToFetch) {
      const [individualResults, orgResults] = await Promise.all([
        fetchTaxonomy(tax, "NPI-1"),
        fetchTaxonomy(tax, "NPI-2"),
      ])
      for (const entry of [...individualResults, ...orgResults]) {
        const dto = normalizeNPIResult(entry as Parameters<typeof normalizeNPIResult>[0])
        if (seenNpis.has(dto.npi)) continue
        seenNpis.add(dto.npi)
        normalized.push(dto)
      }
    }

    if (facility_name) {
      normalized = filterByFacilityName(normalized, facility_name)
    }

    const sortKey = (r: NPIResultDTO) =>
      (r.organizationName ?? ([r.lastName, r.firstName].filter(Boolean).join(" ") || "")).toLowerCase()
    normalized.sort((a, b) => sortKey(a).localeCompare(sortKey(b)))

    return NextResponse.json({
      result_count: normalized.length,
      results: normalized,
    })
  } catch (err) {
    console.error("NPI search error:", err)
    return NextResponse.json(
      { error: "Failed to search NPI registry" },
      { status: 502 }
    )
  }
}
