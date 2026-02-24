"use server"

import {
  getCarriersForLocation,
  getPlansForCarrier,
  type FormPlanType,
} from "@/lib/db/medicare-plans"
import type { MedicarePlanOption } from "@/lib/db/medicare-plans"

export async function fetchCarriersForLocation(
  formPlanType: FormPlanType,
  state: string,
  county: string | null | undefined
): Promise<{ carriers: string[]; error?: string }> {
  return getCarriersForLocation(formPlanType, state, county)
}

export async function fetchPlansForCarrier(
  formPlanType: FormPlanType,
  state: string,
  county: string | null | undefined,
  carrier: string
): Promise<{ plans: MedicarePlanOption[] }> {
  return getPlansForCarrier(formPlanType, state, county, carrier)
}
