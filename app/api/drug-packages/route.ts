import { NextRequest, NextResponse } from "next/server"

const RXNORM_NDC_BASE = "https://rxnav.nlm.nih.gov/REST/rxcui"
const OPENFDA_NDC_BASE = "https://api.fda.gov/drug/ndc.json"
const MAX_NDCS_TO_FETCH = 25

interface OpenFDAPackaging {
  description?: string
  package_ndc?: string
  [key: string]: unknown
}

interface OpenFDAResult {
  packaging?: OpenFDAPackaging[]
  package_ndc?: string
  [key: string]: unknown
}

interface OpenFDAResponse {
  results?: OpenFDAResult[]
  error?: { message: string }
}

export interface DrugPackageDTO {
  packageDescription: string
  packageNdc: string
}

/** Normalize NDC to 11-digit no-dash for OpenFDA search (package_ndc is often stored as 11 digits). */
function normalizeNdc(ndc: string): string {
  const digits = ndc.replace(/\D/g, "")
  if (digits.length === 10) return `0${digits}`
  if (digits.length === 9) return `0${digits}`
  return digits.slice(0, 11)
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const rxcui = searchParams.get("rxcui")?.trim()

  if (!rxcui) {
    return NextResponse.json(
      { error: "rxcui is required" },
      { status: 400 }
    )
  }

  const fetchOptions: RequestInit = {
    next: { revalidate: 0 },
    headers: {
      "User-Agent": "MedicareAgentCRM/1.0 (https://github.com; medication lookup)",
      Accept: "application/json",
    },
  }

  try {
    const ndcUrl = `${RXNORM_NDC_BASE}/${rxcui}/ndcs.json`
    const ndcRes = await fetch(ndcUrl, fetchOptions)
    const ndcData = (await ndcRes.json()) as { ndcGroup?: { ndcList?: { ndc?: string[] } } }
    const ndcList = ndcData?.ndcGroup?.ndcList?.ndc ?? []
    const ndcs = Array.isArray(ndcList) ? ndcList.slice(0, MAX_NDCS_TO_FETCH) : []

    const seenDescriptions = new Set<string>()
    const packages: DrugPackageDTO[] = []
    const apiKey = process.env.OPENFDA_API_KEY

    for (const ndc of ndcs) {
      const normalized = normalizeNdc(ndc)
      if (!normalized) continue
      const params = new URLSearchParams({
        search: `package_ndc:${normalized}`,
        limit: "5",
      })
      if (apiKey) params.set("api_key", apiKey)
      const fdaRes = await fetch(`${OPENFDA_NDC_BASE}?${params.toString()}`, fetchOptions)
      const fdaData = (await fdaRes.json()) as OpenFDAResponse
      const results = fdaData?.results ?? []
      for (const r of results) {
        const packList = r.packaging ?? []
        for (const p of packList) {
          const desc = (p.description ?? (p as { PackageDescription?: string }).PackageDescription)?.trim()
          const pkgNdc = (p.package_ndc ?? r.package_ndc ?? ndc)?.toString() ?? ndc
          if (desc && !seenDescriptions.has(desc)) {
            seenDescriptions.add(desc)
            packages.push({ packageDescription: desc, packageNdc: pkgNdc })
          }
        }
        if (packages.length >= 20) break
      }
      if (packages.length >= 20) break
    }

    return NextResponse.json({ packages })
  } catch (err) {
    console.error("Drug packages error:", err)
    return NextResponse.json(
      { error: "Failed to fetch packages" },
      { status: 502 }
    )
  }
}
