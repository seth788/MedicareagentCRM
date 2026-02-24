import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Client, ClientAddress, ClientPhone, ClientEmail } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format a phone string to (XXX) XXX-XXXX. Strips non-digits, then formats 10 digits. */
export function formatPhoneNumber(value: string | undefined): string {
  if (value == null) return ""
  const digits = value.replace(/\D/g, "")
  if (digits.length >= 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
  }
  if (digits.length >= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  if (digits.length >= 3) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
  }
  if (digits.length > 0) {
    return `(${digits}`
  }
  return ""
}

/** Returns the preferred address or the first in the list; use for single-address display. */
export function getPreferredOrFirstAddress(client: Client): ClientAddress | undefined {
  if (!client.addresses?.length) return undefined
  const preferred = client.addresses.find((a) => a.isPreferred)
  return preferred ?? client.addresses[0]
}

/** Returns the preferred phone or the first in the list; use for single-phone display (header, links). */
export function getPreferredOrFirstPhone(client: Client): ClientPhone | undefined {
  if (client.phones?.length) {
    const preferred = client.phones.find((p) => p.isPreferred)
    return preferred ?? client.phones[0]
  }
  const legacy = (client as { phone?: string }).phone
  if (legacy?.trim()) {
    return { id: "legacy-phone", number: legacy.trim(), type: "Cell", isPreferred: true }
  }
  return undefined
}

/** Returns the preferred email or the first in the list; use for single-email display (header, links). */
export function getPreferredOrFirstEmail(client: Client): ClientEmail | undefined {
  if (client.emails?.length) {
    const preferred = client.emails.find((e) => e.isPreferred)
    return preferred ?? client.emails[0]
  }
  const legacy = (client as { email?: string }).email
  if (legacy?.trim()) {
    return { id: "legacy-email", value: legacy.trim(), isPreferred: true }
  }
  return undefined
}

/** Strip " County" and similar suffixes for API/DB matching (e.g. medicare_plans). "Coosa County" -> "Coosa". */
const COUNTY_SUFFIX_REGEX = /\s+county$/i
const COUNTY_JURISDICTION_REGEX =
  /\s+(parish|borough|census area|municipality|city and borough)$/i

export function normalizeCountyToPlainName(value?: string | null): string | null {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return null
  const withoutCounty = trimmed.replace(COUNTY_SUFFIX_REGEX, "").trim() || trimmed
  const withoutJurisdiction = withoutCounty.replace(COUNTY_JURISDICTION_REGEX, "").trim() || withoutCounty
  return withoutJurisdiction || null
}
