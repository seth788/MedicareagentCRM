/**
 * Parse a date string into a Date at noon local time.
 * This prevents timezone shifts from changing the displayed day
 * (e.g. "2026-04-12T12:00:00.000Z" becoming Apr 11 in UTC-8).
 */
export function parseLocalDate(dateStr: string): Date {
  // Extract just YYYY-MM-DD from any format
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, y, m, d] = match
    // Create date at noon local time - never shifts day across timezones
    return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0)
  }
  return new Date(dateStr)
}

/**
 * Get the date when someone turns 65 (65th birthday) from their DOB.
 * Returns YYYY-MM-DD format.
 */
export function getT65FromDob(dob: string): string {
  const match = dob.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return dob
  const [, y, m, d] = match
  const birthYear = Number(y)
  const turn65Year = birthYear + 65
  return `${turn65Year}-${m}-${d}`
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
