import { NextRequest, NextResponse } from "next/server"

const RXNORM_DRUGS_BASE = "https://rxnav.nlm.nih.gov/REST/drugs.json"
const MAX_LIMIT = 100

/** RxNorm drugs.json response types */
interface RxNormConceptProperty {
  rxcui: string
  name: string
  synonym?: string
  tty: string
  language?: string
  suppress?: string
  umlscui?: string
}

interface RxNormConceptGroup {
  tty: string
  conceptProperties?: RxNormConceptProperty[]
}

interface RxNormDrugGroup {
  name: string | null
  conceptGroup: RxNormConceptGroup[]
}

interface RxNormDrugsResponse {
  drugGroup?: RxNormDrugGroup
}

export interface DrugProductDTO {
  /** Display/generic base name for grouping and autocomplete */
  drugName: string
  /** Brand name when available (e.g. from SBD [Brand Name]) */
  brandName?: string
  /** Full strength and form (legacy); same as dosageDisplay for variant dropdown */
  dosageLabel: string
  /** Full concept name for Layer 2 variant dropdown (e.g. "insulin lispro 100 UNT/mL Cartridge [Humalog]") */
  dosageDisplay: string
  /** Extracted dose form string for package-required classification */
  doseForm: string
  /** RxNorm concept ID for this dose/form */
  rxcui: string
  /** SBD = branded, SCD = generic clinical drug */
  tty?: string
  /** When true, UI can pre-select this option as suggested default */
  isDefault?: boolean
}

/**
 * Derive a short "base" name for grouping from full concept name.
 * e.g. "lisinopril 10 MG Oral Tablet [Zestril]" -> "Lisinopril", "10 MG Oral Tablet [Zestril]"
 */
function parseConceptName(fullName: string): { baseName: string; doseForm: string } {
  const trimmed = fullName.trim()
  // Match strength patterns like "10 MG", "2.5 MG", "1 MG/ML" to split base vs dose/form
  const strengthMatch = trimmed.match(/\s+(\d+(?:\.\d+)?\s*(?:MG|MG\/ML|ML)(?:\s+\S+)*)$/i)
  if (strengthMatch) {
    const baseName = trimmed.slice(0, strengthMatch.index).trim()
    const doseForm = strengthMatch[1].trim()
    return {
      baseName: baseName ? baseName.charAt(0).toUpperCase() + baseName.slice(1).toLowerCase() : trimmed,
      doseForm,
    }
  }
  const first = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
  return { baseName: first, doseForm: first }
}

/**
 * Extract brand from SBD name like "lisinopril 10 MG Oral Tablet [Zestril]".
 */
function extractBrand(fullName: string): string | undefined {
  const m = fullName.match(/\s*\[([^\]]+)\]$/)
  return m ? m[1].trim() : undefined
}

/** Known dose form phrases for package-required classification (lowercase). */
const PACKAGE_REQUIRED_FORMS = [
  "injectable solution",
  "injectable suspension",
  "pen injector",
  "cartridge",
  "prefilled syringe",
  "auto-injector",
  "metered dose inhaler",
  "inhaler",
  "ophthalmic solution",
  "topical cream",
  "ointment",
  "gel",
  "topical gel",
  "patch",
  "transdermal",
]

/** Extract a single dose form string from concept name for classification; normalized lowercase. */
function extractDoseForm(conceptName: string): string {
  const lower = conceptName.toLowerCase()
  for (const form of PACKAGE_REQUIRED_FORMS) {
    if (lower.includes(form)) return form
  }
  if (lower.includes("oral tablet")) return "oral tablet"
  if (lower.includes("oral capsule")) return "oral capsule"
  if (lower.includes("oral solution")) return "oral solution"
  if (lower.includes("oral suspension")) return "oral suspension"
  if (lower.includes("sublingual tablet")) return "sublingual tablet"
  if (lower.includes("orally disintegrating") || lower.includes("odt")) return "orally disintegrating tablet"
  return ""
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get("q")?.trim()
  const allowGenerics = searchParams.get("allow_generics") !== "false"
  const limitParam = searchParams.get("limit")
  const limit = Math.min(
    Math.max(1, parseInt(limitParam ?? "20", 10) || 20),
    MAX_LIMIT
  )

  if (!q || q.length < 2) {
    return NextResponse.json(
      { error: "Query q is required and must be at least 2 characters" },
      { status: 400 }
    )
  }

  const searchTerm = encodeURIComponent(q.replace(/[\\"]/g, " ").trim())
  if (!searchTerm) {
    return NextResponse.json(
      { error: "Invalid query" },
      { status: 400 }
    )
  }

  try {
    const url = `${RXNORM_DRUGS_BASE}?name=${searchTerm}`
    const res = await fetch(url, {
      next: { revalidate: 0 },
      headers: {
        "User-Agent": "MedicareAgentCRM/1.0 (https://github.com; medication lookup)",
        Accept: "application/json",
      },
    })

    if (!res.ok) {
      console.error("RxNorm drugs API non-OK:", res.status, await res.text())
      return NextResponse.json({ products: [] })
    }

    let data: RxNormDrugsResponse
    try {
      data = (await res.json()) as RxNormDrugsResponse
    } catch {
      console.error("RxNorm drugs API invalid JSON")
      return NextResponse.json({ products: [] })
    }

    const drugGroup = data?.drugGroup
    const conceptGroups = Array.isArray(drugGroup?.conceptGroup) ? drugGroup.conceptGroup : []
    const concepts: RxNormConceptProperty[] = []

    for (const group of conceptGroups) {
      const tty = group.tty ?? ""
      if (tty !== "SBD" && tty !== "SCD") continue
      if (!allowGenerics && tty === "SCD") continue
      const props = group.conceptProperties ?? []
      for (const c of props) {
        concepts.push(c)
      }
    }

    const byRxcui = new Map<string, DrugProductDTO>()
    const doseFormOrder: string[] = []

    for (const c of concepts) {
      if (!c.rxcui || !c.name) continue
      if (byRxcui.has(c.rxcui)) continue

      const { baseName, doseForm } = parseConceptName(c.name)
      const brand = c.tty === "SBD" ? extractBrand(c.name) : undefined

      const doseFormExtracted = extractDoseForm(c.name)
      byRxcui.set(c.rxcui, {
        drugName: baseName,
        brandName: brand && brand !== baseName ? brand : undefined,
        dosageLabel: doseForm,
        dosageDisplay: c.name,
        doseForm: doseFormExtracted,
        rxcui: c.rxcui,
        tty: c.tty,
      })
      doseFormOrder.push(c.rxcui)
    }

    const products = doseFormOrder
      .map((rxcui) => byRxcui.get(rxcui))
      .filter(Boolean) as DrugProductDTO[]

    // Default selection: single option -> isDefault; multiple -> middle option for generics
    if (products.length === 1) {
      products[0].isDefault = true
    } else if (products.length > 1) {
      const mid = Math.floor(products.length / 2)
      products[mid].isDefault = true
    }

    const limited = products.slice(0, limit)
    return NextResponse.json({ products: limited })
  } catch (err) {
    console.error("Drug search error:", err)
    return NextResponse.json(
      { error: "Failed to search drug database" },
      { status: 502 }
    )
  }
}
