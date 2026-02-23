/**
 * Parse a date string into a Date at noon local time.
 * This prevents timezone shifts from changing the displayed day
 * (e.g. "2026-04-12T12:00:00.000Z" becoming Apr 11 in UTC-8).
 * Supports YYYY-MM-DD and MM/DD/YYYY.
 */
export function parseLocalDate(dateStr: string): Date {
  if (!dateStr?.trim()) return new Date(NaN)
  // YYYY-MM-DD (ISO)
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) {
    const [, y, m, d] = iso
    return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0)
  }
  // MM/DD/YYYY
  const us = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (us) {
    const [, m, d, y] = us
    return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0)
  }
  return new Date(dateStr)
}

/**
 * Convert stored effective date (MM/DD/YYYY or YYYY-MM-DD) to "YYYY-MM" for month input.
 */
export function effectiveDateToMonthValue(stored: string): string {
  if (!stored?.trim()) return ""
  const iso = stored.match(/^(\d{4})-(\d{2})/)
  if (iso) return stored.slice(0, 7) // "2024-03-01" -> "2024-03"
  const us = stored.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (us) {
    const [, m, , y] = us
    return `${y}-${m.padStart(2, "0")}` // "03/01/2024" -> "2024-03"
  }
  return ""
}

/**
 * Convert month input value "YYYY-MM" to stored effective date MM/DD/YYYY (day always 01).
 */
export function monthValueToEffectiveDate(yyyyMm: string): string {
  if (!yyyyMm?.trim()) return ""
  const match = yyyyMm.match(/^(\d{4})-(\d{2})$/)
  if (!match) return ""
  const [, y, m] = match
  return `${m}/${"01"}/${y}` // MM/01/YYYY
}

/**
 * Get the date when someone turns 65 (65th birthday) from their DOB.
 * Works with YYYY-MM-DD or MM/DD/YYYY. Returns YYYY-MM-DD format.
 */
export function getT65FromDob(dob: string): string {
  const birth = parseLocalDate(dob)
  if (Number.isNaN(birth.getTime())) return dob
  const y = birth.getFullYear()
  const m = birth.getMonth()
  const d = birth.getDate()
  const turn65 = new Date(y + 65, m, d, 12, 0, 0)
  const yy = turn65.getFullYear()
  const mm = String(turn65.getMonth() + 1).padStart(2, "0")
  const dd = String(turn65.getDate()).padStart(2, "0")
  return `${yy}-${mm}-${dd}`
}

/**
 * Get current age in years from DOB.
 */
export function getAgeFromDob(dob: string): number {
  const birth = parseLocalDate(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}
