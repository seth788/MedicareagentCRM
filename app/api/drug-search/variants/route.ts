import { NextRequest, NextResponse } from "next/server"
import type { DrugProductDTO } from "../route"

const RXNORM_RXCUI_BASE = "https://rxnav.nlm.nih.gov/REST/rxcui.json"
const RXNORM_RELATED_BASE = "https://rxnav.nlm.nih.gov/REST/rxcui"
const RXNORM_PROPERTY_BASE = "https://rxnav.nlm.nih.gov/REST/rxcui"

// Cache 24h — RxNorm variant data changes infrequently (reference data).
const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
  headers: {
    "User-Agent": "MedicareAgentCRM/1.0 (https://github.com; medication lookup)",
    Accept: "application/json",
  },
}

interface RxNormConceptProperty {
  rxcui: string
  name: string
  synonym?: string
  tty: string
}

interface RxNormConceptGroup {
  tty: string
  conceptProperties?: RxNormConceptProperty[]
}

function parseConceptName(fullName: string): { baseName: string; doseForm: string } {
  const trimmed = fullName.trim()
  const strengthMatch = trimmed.match(/\s+(\d+(?:\.\d+)?\s*(?:MG|MG\/ML|ML|UNT\/ML)(?:\s+\S+)*)$/i)
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

function extractBrand(fullName: string): string | undefined {
  const m = fullName.match(/\s*\[([^\]]+)\]$/)
  return m ? m[1].trim() : undefined
}

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

async function getTty(rxcui: string): Promise<string | null> {
  const propUrl = `${RXNORM_PROPERTY_BASE}/${rxcui}/property.json?propName=TTY`
  const propRes = await fetch(propUrl, fetchOptions)
  if (!propRes.ok) return null
  const propData = (await propRes.json()) as {
    propConceptGroup?: { propConcept?: Array<{ propValue?: string }> }
  }
  return propData?.propConceptGroup?.propConcept?.[0]?.propValue?.trim() ?? null
}

/** For IN: get ingredient RxCUIs for a concept (e.g. SCD). related?tty=IN */
async function getIngredientRxcuis(conceptRxcui: string): Promise<string[]> {
  const url = `${RXNORM_RELATED_BASE}/${conceptRxcui}/related.json?tty=IN`
  const res = await fetch(url, fetchOptions)
  if (!res.ok) return []
  const data = (await res.json()) as { relatedGroup?: { conceptGroup?: RxNormConceptGroup[] } }
  const ids: string[] = []
  for (const group of data?.relatedGroup?.conceptGroup ?? []) {
    if (group.tty !== "IN") continue
    for (const p of group.conceptProperties ?? []) {
      if (p.rxcui?.trim()) ids.push(p.rxcui.trim())
    }
  }
  return ids
}

/**
 * Step 2 + 3: Resolve name to RxCUI, get TTY, fetch variants by type. For IN, filter SCDs by single-ingredient match.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get("name")?.trim()

  if (!name) {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    )
  }

  const selectedName = encodeURIComponent(name.replace(/[\\"]/g, " ").trim())
  if (!selectedName) {
    return NextResponse.json(
      { error: "Invalid name" },
      { status: 400 }
    )
  }

  try {
    const rxcuiUrl = `${RXNORM_RXCUI_BASE}?name=${selectedName}&search=2`
    const rxcuiRes = await fetch(rxcuiUrl, fetchOptions)
    if (!rxcuiRes.ok) {
      console.error("RxNorm rxcui.json non-OK:", rxcuiRes.status)
      return NextResponse.json({ rxcui: null, products: [] })
    }

    const rxcuiData = (await rxcuiRes.json()) as { idGroup?: { rxnormId?: string | string[] } }
    const idGroup = rxcuiData?.idGroup
    const rawId = Array.isArray(idGroup?.rxnormId)
      ? idGroup!.rxnormId[0]
      : idGroup?.rxnormId
    const rxcui = typeof rawId === "string" ? rawId.trim() : null
    if (!rxcui) return NextResponse.json({ rxcui: null, products: [] })

    const selectedTty = await getTty(rxcui)
    let relatedUrl: string
    let dosageTtys: string[]

    if (selectedTty === "BN") {
      relatedUrl = `${RXNORM_RELATED_BASE}/${rxcui}/related.json?tty=SBD+BPCK`
      dosageTtys = ["SBD"]
    } else if (selectedTty === "IN") {
      relatedUrl = `${RXNORM_RELATED_BASE}/${rxcui}/related.json?tty=SCD+GPCK`
      dosageTtys = ["SCD"]
    } else {
      relatedUrl = `${RXNORM_RELATED_BASE}/${rxcui}/related.json?tty=SCD+SBD+GPCK+BPCK`
      dosageTtys = ["SCD", "SBD"]
    }

    const relatedRes = await fetch(relatedUrl, fetchOptions)
    if (!relatedRes.ok) {
      console.error("RxNorm related.json non-OK:", relatedRes.status)
      return NextResponse.json({ rxcui, products: [] })
    }

    const relatedData = (await relatedRes.json()) as {
      relatedGroup?: { conceptGroup?: RxNormConceptGroup[] }
    }
    const conceptGroups = relatedData?.relatedGroup?.conceptGroup ?? []
    let concepts: RxNormConceptProperty[] = []

    for (const group of conceptGroups) {
      const tty = group.tty ?? ""
      if (!dosageTtys.includes(tty)) continue
      const props = group.conceptProperties ?? []
      for (const c of props) concepts.push(c)
    }

    if (selectedTty === "IN" && concepts.length > 0) {
      const ingredientChecks = await Promise.all(
        concepts.map(async (c): Promise<{ c: RxNormConceptProperty; keep: boolean }> => {
          const ingredientRxcuis = await getIngredientRxcuis(c.rxcui)
          const singleMatch =
            ingredientRxcuis.length === 1 && ingredientRxcuis[0] === rxcui
          return { c, keep: singleMatch }
        })
      )
      concepts = ingredientChecks.filter((x) => x.keep).map((x) => x.c)
    }

    const byRxcui = new Map<string, DrugProductDTO>()
    const order: string[] = []

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
      order.push(c.rxcui)
    }

    const products = order.map((id) => byRxcui.get(id)).filter(Boolean) as DrugProductDTO[]

    if (products.length === 1) {
      products[0].isDefault = true
    } else if (products.length > 1) {
      const mid = Math.floor(products.length / 2)
      products[mid].isDefault = true
    }

    return NextResponse.json({ rxcui, products })
  } catch (err) {
    console.error("Drug variants error:", err)
    return NextResponse.json(
      { error: "Failed to resolve drug variants" },
      { status: 502 }
    )
  }
}
