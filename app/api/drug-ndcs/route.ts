import { NextRequest, NextResponse } from "next/server"

const RXNORM_NDC_BASE = "https://rxnav.nlm.nih.gov/REST/rxcui"

interface RxNormNdcResponse {
  ndcGroup?: {
    rxcui: string | null
    ndcList?: { ndc?: string[] }
  }
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

  try {
    const url = `${RXNORM_NDC_BASE}/${rxcui}/ndcs.json`
    // Cache 24h — RxNorm NDC list changes infrequently (reference data).
    const res = await fetch(url, {
      next: { revalidate: 86400 },
      headers: {
        "User-Agent": "MedicareAgentCRM/1.0 (https://github.com; medication lookup)",
        Accept: "application/json",
      },
    })
    const data = (await res.json()) as RxNormNdcResponse

    const ndcList = data.ndcGroup?.ndcList?.ndc
    const ndcs = Array.isArray(ndcList) ? ndcList : []

    return NextResponse.json({ ndcs })
  } catch (err) {
    console.error("Drug NDCs error:", err)
    return NextResponse.json(
      { error: "Failed to fetch NDCs" },
      { status: 502 }
    )
  }
}
