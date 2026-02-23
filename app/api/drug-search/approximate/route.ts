import { NextRequest, NextResponse } from "next/server"

const RXNORM_AUTOCOMPLETE_BASE = "https://rxnav.nlm.nih.gov/REST/autocomplete.json"
const RXNORM_APPROXIMATE_BASE = "https://rxnav.nlm.nih.gov/REST/approximateTerm.json"
const RXNORM_PROPERTY_BASE = "https://rxnav.nlm.nih.gov/REST/rxcui"
const AUTOCOMPLETE_FETCH_COUNT = 20
const VISIBLE_CAP = 10

/** TTY values to keep in typeahead (top-level drug names only). */
const ALLOWED_TTY = new Set(["IN", "MIN", "BN"])

// Cache 24h — RxNorm typeahead/reference data changes infrequently.
const fetchOptions: RequestInit = {
  next: { revalidate: 86400 },
  headers: {
    "User-Agent": "MedicareAgentCRM/1.0 (https://github.com; medication lookup)",
    Accept: "application/json",
  },
}

/**
 * Step 1 — Autocomplete: fetch up to 20 raw suggestions.
 * Step 2 — For each suggestion, resolve RxCUI then TTY in parallel; keep only IN, MIN, BN.
 * Returns filtered list capped at 10.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const term = searchParams.get("term")?.trim()

  if (!term || term.length < 2) {
    return NextResponse.json(
      { error: "term is required and must be at least 2 characters" },
      { status: 400 }
    )
  }

  const searchTerm = encodeURIComponent(term.replace(/[\\"]/g, " ").trim())
  if (!searchTerm) {
    return NextResponse.json(
      { error: "Invalid term" },
      { status: 400 }
    )
  }

  try {
    const autocompleteUrl = `${RXNORM_AUTOCOMPLETE_BASE}?term=${searchTerm}&maxEntries=${AUTOCOMPLETE_FETCH_COUNT}`
    const res = await fetch(autocompleteUrl, fetchOptions)

    let rawSuggestions: string[] = []

    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) {
        rawSuggestions = data
          .filter((x: unknown) => typeof x === "string")
          .map((s: string) => s.trim())
          .filter(Boolean)
      }
    }

    if (rawSuggestions.length === 0) {
      const fallbackRes = await fetch(
        `${RXNORM_APPROXIMATE_BASE}?term=${searchTerm}&maxEntries=${AUTOCOMPLETE_FETCH_COUNT}`,
        fetchOptions
      )
      if (fallbackRes.ok) {
        const fallbackData = (await fallbackRes.json()) as {
          approximateGroup?: { candidate?: Array<{ name?: string }> }
        }
        const seen = new Set<string>()
        for (const c of fallbackData?.approximateGroup?.candidate ?? []) {
          const name = c.name?.trim()
          if (name && !seen.has(name.toLowerCase())) {
            seen.add(name.toLowerCase())
            rawSuggestions.push(name)
            if (rawSuggestions.length >= AUTOCOMPLETE_FETCH_COUNT) break
          }
        }
      }
    }

    if (rawSuggestions.length === 0) {
      return NextResponse.json({ suggestions: [] })
    }

    const dedupeLower = new Set<string>()

    const ttyResults = await Promise.all(
      rawSuggestions.map(async (suggestion): Promise<{ suggestion: string; tty: string | null }> => {
        try {
          const approxUrl = `${RXNORM_APPROXIMATE_BASE}?term=${encodeURIComponent(suggestion)}&maxEntries=1`
          const approxRes = await fetch(approxUrl, fetchOptions)
          if (!approxRes.ok) return { suggestion, tty: null }
          const approxData = (await approxRes.json()) as {
            approximateGroup?: { candidate?: Array<{ rxcui?: string }> }
          }
          const candidate = approxData?.approximateGroup?.candidate?.[0]
          const rxcui = candidate?.rxcui?.trim()
          if (!rxcui) return { suggestion, tty: null }
          const propUrl = `${RXNORM_PROPERTY_BASE}/${rxcui}/property.json?propName=TTY`
          const propRes = await fetch(propUrl, fetchOptions)
          if (!propRes.ok) return { suggestion, tty: null }
          const propData = (await propRes.json()) as {
            propConceptGroup?: { propConcept?: Array<{ propValue?: string }> }
          }
          const tty = propData?.propConceptGroup?.propConcept?.[0]?.propValue?.trim() ?? null
          return { suggestion, tty }
        } catch {
          return { suggestion, tty: null }
        }
      })
    )

    const suggestions: string[] = []
    for (const { suggestion, tty } of ttyResults) {
      if (suggestion && tty && ALLOWED_TTY.has(tty)) {
        const key = suggestion.toLowerCase()
        if (!dedupeLower.has(key)) {
          dedupeLower.add(key)
          suggestions.push(suggestion)
          if (suggestions.length >= VISIBLE_CAP) break
        }
      }
    }

    if (suggestions.length === 0) {
      const fallbackApproxUrl = `${RXNORM_APPROXIMATE_BASE}?term=${searchTerm}&maxEntries=5`
      const fallbackApproxRes = await fetch(fallbackApproxUrl, fetchOptions)
      if (fallbackApproxRes.ok) {
        const fallbackApproxData = (await fallbackApproxRes.json()) as {
          approximateGroup?: { candidate?: Array<{ rxcui?: string; name?: string }> }
        }
        const candidates = fallbackApproxData?.approximateGroup?.candidate ?? []
        const byRxcui = new Map<string, string>()
        for (const c of candidates) {
          const rxcui = c.rxcui?.trim()
          const name = c.name?.trim()
          if (rxcui && name && !byRxcui.has(rxcui)) byRxcui.set(rxcui, name)
        }
        const fallbackTtyResults = await Promise.all(
          Array.from(byRxcui.entries()).map(
            async ([rxcui, suggestion]): Promise<{ suggestion: string; tty: string | null }> => {
              try {
                const propUrl = `${RXNORM_PROPERTY_BASE}/${rxcui}/property.json?propName=TTY`
                const propRes = await fetch(propUrl, fetchOptions)
                if (!propRes.ok) return { suggestion, tty: null }
                const propData = (await propRes.json()) as {
                  propConceptGroup?: { propConcept?: Array<{ propValue?: string }> }
                }
                const tty =
                  propData?.propConceptGroup?.propConcept?.[0]?.propValue?.trim() ?? null
                return { suggestion, tty }
              } catch {
                return { suggestion, tty: null }
              }
            }
          )
        )
        const fallbackDedupe = new Set<string>()
        for (const { suggestion: s, tty } of fallbackTtyResults) {
          if (s && tty && ALLOWED_TTY.has(tty)) {
            const key = s.toLowerCase()
            if (!fallbackDedupe.has(key)) {
              fallbackDedupe.add(key)
              suggestions.push(s)
              if (suggestions.length >= VISIBLE_CAP) break
            }
          }
        }
      }
    }

    return NextResponse.json({ suggestions })
  } catch (err) {
    console.error("Drug typeahead search error:", err)
    return NextResponse.json(
      { error: "Failed to search drug database" },
      { status: 502 }
    )
  }
}
