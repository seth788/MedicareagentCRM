import { NextRequest, NextResponse } from "next/server"
import {
  normalizeNPIResult,
  filterByOrganizationName,
  getOrganizationDisplayName,
  PHARMACY_TAXONOMY,
  type NPIResultDTO,
} from "@/lib/npi"
// eslint-disable-next-line @typescript-eslint/no-require-imports
const zipcodes = require("zipcodes") as { radius: (zip: number, miles: number) => string[] }

const NPI_BASE = "https://npiregistry.cms.hhs.gov/api/"

/** Max zip codes to query when using radius (avoids too many NPI requests). */
const MAX_ZIPS_FOR_RADIUS = 20

interface NPIResponse {
  result_count?: number
  results?: Record<string, unknown>[]
}

const ZIP_5_REGEX = /^\d{5}$/

async function fetchPharmaciesForZip(zip5: string): Promise<Record<string, unknown>[]> {
  const params = new URLSearchParams({
    version: "2.1",
    enumeration_type: "NPI-2",
    taxonomy_description: PHARMACY_TAXONOMY,
    postal_code: zip5,
    limit: "200",
  })
  const url = `${NPI_BASE}?${params.toString()}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) return []
  const data = (await res.json()) as NPIResponse
  return data.results ?? []
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const postal_code = searchParams.get("postal_code")?.trim()
  const name = searchParams.get("name")?.trim()
  const radius_miles = searchParams.get("radius_miles")?.trim()

  if (!postal_code) {
    return NextResponse.json(
      { error: "postal_code is required" },
      { status: 400 }
    )
  }

  const zip5 = postal_code.slice(0, 5)
  if (!ZIP_5_REGEX.test(zip5)) {
    return NextResponse.json(
      { error: "postal_code must be a valid 5-digit zip code" },
      { status: 400 }
    )
  }

  try {
    let zipsToQuery: string[] = [zip5]
    const miles = radius_miles ? parseInt(radius_miles, 10) : 0
    if (miles > 0 && Number.isFinite(miles)) {
      const radiusZips = zipcodes.radius(parseInt(zip5, 10), miles)
      if (Array.isArray(radiusZips) && radiusZips.length > 0) {
        zipsToQuery = radiusZips.slice(0, MAX_ZIPS_FOR_RADIUS).map(String)
        if (!zipsToQuery.includes(zip5)) {
          zipsToQuery = [zip5, ...zipsToQuery.filter((z) => z !== zip5)].slice(0, MAX_ZIPS_FOR_RADIUS)
        }
      }
    }

    const seenNpis = new Set<string>()
    const normalized: NPIResultDTO[] = []

    const resultArrays = await Promise.all(zipsToQuery.map((z) => fetchPharmaciesForZip(z)))
    for (const rawResults of resultArrays) {
      for (const entry of rawResults) {
        const dto = normalizeNPIResult(entry as Parameters<typeof normalizeNPIResult>[0])
        if (seenNpis.has(dto.npi)) continue
        seenNpis.add(dto.npi)
        normalized.push(dto)
      }
    }

    let filtered = normalized
    if (name) {
      filtered = filterByOrganizationName(filtered, name)
    }

    const sortKey = (r: NPIResultDTO) =>
      getOrganizationDisplayName(r).toLowerCase()
    filtered.sort((a, b) => sortKey(a).localeCompare(sortKey(b)))

    return NextResponse.json({
      result_count: filtered.length,
      results: filtered,
    })
  } catch (err) {
    console.error("NPI pharmacy search error:", err)
    return NextResponse.json(
      { error: "Failed to search NPI registry" },
      { status: 502 }
    )
  }
}
