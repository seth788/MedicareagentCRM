"use client"

import React, { useRef, useEffect, useState, useCallback } from "react"
import Script from "next/script"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { GooglePlaceAddress } from "@/types/google-maps"
import type { PlacePrediction } from "@/types/google-maps"

const GOOGLE_SCRIPT_URL = "https://maps.googleapis.com/maps/api/js"
const ADDRESS_TYPES = ["address"]
const DEBOUNCE_MS = 300

function getScriptUrl(): string {
  const key = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
  if (!key) return ""
  return `${GOOGLE_SCRIPT_URL}?key=${key}&libraries=places`
}

function parseAddressComponents(
  components: Array<{ long_name: string; short_name: string; types: string[] }>
): GooglePlaceAddress {
  let streetNumber = ""
  let route = ""
  let city = ""
  let state = ""
  let zip = ""

  for (const c of components) {
    if (c.types.includes("street_number")) streetNumber = c.long_name
    if (c.types.includes("route")) route = c.long_name
    if (c.types.includes("locality")) city = c.long_name
    if (c.types.includes("sublocality") && !city) city = c.long_name
    if (c.types.includes("administrative_area_level_1")) state = c.short_name
    if (c.types.includes("postal_code")) zip = c.long_name
  }

  const address =
    [streetNumber, route].filter(Boolean).join(" ") || route || streetNumber

  return { address: address.trim(), city, state, zip }
}

function placeToAddress(place: {
  address_components?: Array<{ long_name: string; short_name: string; types: string[] }>
  formatted_address?: string
}): GooglePlaceAddress | null {
  if (place.address_components && place.address_components.length > 0) {
    return parseAddressComponents(place.address_components)
  }
  if (place.formatted_address) {
    return {
      address: place.formatted_address,
      city: "",
      state: "",
      zip: "",
    }
  }
  return null
}

export interface AddressAutocompleteProps
  extends Omit<React.ComponentProps<typeof Input>, "onChange" | "value"> {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onPlaceSelect: (address: GooglePlaceAddress) => void
  /** Pass the dialog open state so the dropdown works when the dialog opens. */
  dialogOpen?: boolean
}

export function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  id,
  className,
  placeholder = "Start typing an address...",
  dialogOpen = true,
  ...inputProps
}: AddressAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const serviceRef = useRef<HTMLDivElement>(null)
  const onPlaceSelectRef = useRef(onPlaceSelect)
  const [scriptReady, setScriptReady] = useState(false)
  const [predictions, setPredictions] = useState<PlacePrediction[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  onPlaceSelectRef.current = onPlaceSelect

  // When we mount, the script may already be loaded by a previous instance (e.g. after
  // closing one dialog and opening another). If so, set scriptReady so autocomplete works.
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      typeof google !== "undefined" &&
      google.maps?.places?.AutocompleteService
    ) {
      setScriptReady(true)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const fetchPredictions = useCallback((input: string) => {
    if (typeof google === "undefined" || !google.maps?.places?.AutocompleteService) return
    const trimmed = input.trim()
    if (!trimmed) {
      setPredictions([])
      setOpen(false)
      return
    }
    setLoading(true)
    const service = new google.maps.places.AutocompleteService()
    service.getPlacePredictions(
      { input: trimmed, types: ADDRESS_TYPES },
      (results, status) => {
        setLoading(false)
        if (status !== "OK" || !results) {
          setPredictions([])
          return
        }
        setPredictions(results)
        setOpen(true)
        setHighlightIndex(-1)
      }
    )
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e)
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (!scriptReady) return
      debounceRef.current = setTimeout(() => {
        fetchPredictions(e.target.value)
      }, DEBOUNCE_MS)
    },
    [onChange, scriptReady, fetchPredictions]
  )

  const selectPlace = useCallback(
    (placeId: string, description: string) => {
      setOpen(false)
      setPredictions([])
      setHighlightIndex(-1)
      if (!serviceRef.current || typeof google === "undefined") return
      const service = new google.maps.places.PlacesService(serviceRef.current)
      service.getDetails(
        {
          placeId: placeId,
          fields: ["address_components", "formatted_address"],
        },
        (result, status) => {
          if (status === "OK" && result) {
            const r = result as {
              address_components?: Array<{ long_name: string; short_name: string; types: string[] }>
              formatted_address?: string
            }
            const parsed = placeToAddress(r)
            if (parsed) {
              onPlaceSelectRef.current(parsed)
              return
            }
          }
          onPlaceSelectRef.current({
            address: description,
            city: "",
            state: "",
            zip: "",
          })
        }
      )
    },
    []
  )

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [open])

  // Keyboard: arrow down/up and Enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!open || predictions.length === 0) {
        if (e.key === "Escape") setOpen(false)
        return
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setHighlightIndex((i) => (i < predictions.length - 1 ? i + 1 : 0))
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setHighlightIndex((i) => (i <= 0 ? predictions.length - 1 : i - 1))
        return
      }
      if (e.key === "Enter" && highlightIndex >= 0 && predictions[highlightIndex]) {
        e.preventDefault()
        const p = predictions[highlightIndex]
        selectPlace(p.place_id, p.description)
        return
      }
      if (e.key === "Escape") {
        setOpen(false)
        setHighlightIndex(-1)
      }
    },
    [open, predictions, highlightIndex, selectPlace]
  )

  const scriptUrl = getScriptUrl()

  return (
    <>
      {scriptUrl && (
        <Script
          src={scriptUrl}
          strategy="afterInteractive"
          onLoad={() => setScriptReady(true)}
        />
      )}
      <div ref={serviceRef} className="hidden" aria-hidden="true" />
      <div ref={containerRef} className="relative">
        <Input
          id={id}
          className={cn(className)}
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value.trim() && predictions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={id ? `${id}-listbox` : undefined}
          role="combobox"
          {...inputProps}
        />
        {open && (
          <div
            id={id ? `${id}-listbox` : undefined}
            role="listbox"
            className="absolute z-50 mt-1 w-full rounded-md border bg-popover py-1 text-popover-foreground shadow-md"
          >
            {loading ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                Loading...
              </div>
            ) : predictions.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No addresses found
              </div>
            ) : (
              <ul className="max-h-[280px] overflow-y-auto">
                {predictions.map((p, i) => (
                  <li key={p.place_id} role="option" aria-selected={highlightIndex === i}>
                    <button
                      type="button"
                      className={cn(
                        "w-full cursor-pointer px-3 py-2 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground",
                        highlightIndex === i && "bg-accent text-accent-foreground"
                      )}
                      onMouseEnter={() => setHighlightIndex(i)}
                      onMouseDown={(e) => {
                        e.preventDefault()
                        selectPlace(p.place_id, p.description)
                      }}
                    >
                      {p.structured_formatting ? (
                        <>
                          <span className="font-medium">
                            {p.structured_formatting.main_text}
                          </span>
                          {p.structured_formatting.secondary_text && (
                            <span className="ml-1 text-muted-foreground">
                              {p.structured_formatting.secondary_text}
                            </span>
                          )}
                        </>
                      ) : (
                        p.description
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  )
}
