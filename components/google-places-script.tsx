"use client"

import Script from "next/script"

const GOOGLE_SCRIPT_URL = "https://maps.googleapis.com/maps/api/js"

function getScriptUrl(): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!key) return ""
  return `${GOOGLE_SCRIPT_URL}?key=${key}&libraries=places`
}

/**
 * Loads the Google Places API script once at app level so address autocomplete
 * is ready when dialogs (e.g. New Client) open, instead of loading only when
 * the autocomplete component mounts.
 */
export function GooglePlacesScript() {
  const scriptUrl = getScriptUrl()
  if (!scriptUrl) return null
  return (
    <Script
      src={scriptUrl}
      strategy="afterInteractive"
    />
  )
}
