import { createClient } from "@/lib/supabase/server"
import { normalizeCountyToPlainName } from "@/lib/utils"

export type FormPlanType = "MAPD" | "PDP"

const MAPD_PLAN_TYPES = ["MA-PD", "SNP", "MA"] as const

function getPlanTypeFilter(formPlanType: FormPlanType): string[] {
  if (formPlanType === "MAPD") return [...MAPD_PLAN_TYPES]
  return ["PDP"]
}

export interface MedicarePlanOption {
  id: string
  planName: string
  contractId: string
}

/** Returns distinct carrier names (org_marketing_name) for the given plan type, state, and county. Includes plans where county = 'All Counties'. */
export async function getCarriersForLocation(
  formPlanType: FormPlanType,
  state: string,
  county: string | null | undefined
): Promise<{ carriers: string[]; error?: string }> {
  const normalized = normalizeCountyToPlainName(county)
  if (!state?.trim()) return { carriers: [] }
  const supabase = await createClient()
  const planTypes = getPlanTypeFilter(formPlanType)
  const countyFilter =
    normalized?.trim()
      ? `county.eq.${normalized.trim()},county.eq.All Counties`
      : "county.eq.All Counties"

  const { data, error } = await supabase
    .from("medicare_plans")
    .select("org_marketing_name")
    .in("plan_type", planTypes)
    .eq("state", state.trim().toUpperCase())
    .or(countyFilter)
    .order("org_marketing_name")

  if (error) {
    console.error("[medicare-plans] getCarriersForLocation", error)
    return { carriers: [], error: error.message }
  }

  const names = [...new Set((data ?? []).map((r) => (r as { org_marketing_name: string }).org_marketing_name).filter(Boolean))]
  names.sort()
  return { carriers: names }
}

/** Returns plans for the given plan type, state, county, and carrier. Includes plans where county = 'All Counties'. */
export async function getPlansForCarrier(
  formPlanType: FormPlanType,
  state: string,
  county: string | null | undefined,
  carrier: string
): Promise<{ plans: MedicarePlanOption[] }> {
  const normalized = normalizeCountyToPlainName(county)
  if (!state?.trim() || !carrier?.trim()) return { plans: [] }
  const supabase = await createClient()
  const planTypes = getPlanTypeFilter(formPlanType)
  const countyFilter =
    normalized?.trim()
      ? `county.eq.${normalized.trim()},county.eq.All Counties`
      : "county.eq.All Counties"

  const { data, error } = await supabase
    .from("medicare_plans")
    .select("id, plan_name, contract_id")
    .in("plan_type", planTypes)
    .eq("state", state.trim().toUpperCase())
    .or(countyFilter)
    .eq("org_marketing_name", carrier.trim())
    .order("plan_name")

  if (error) {
    console.error("[medicare-plans] getPlansForCarrier", error)
    return { plans: [] }
  }

  const plans: MedicarePlanOption[] = (data ?? []).map((r) => {
    const row = r as { id: string; plan_name: string; contract_id: string }
    return {
      id: row.id,
      planName: row.plan_name ?? "",
      contractId: row.contract_id ?? "",
    }
  })
  return { plans }
}
