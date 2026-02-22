"use client"

import { useEffect } from "react"
import { useTheme } from "next-themes"

/**
 * Forces the theme to light on auth pages (login/signup) where the user has no saved profile.
 * Renders nothing.
 */
export function ForceLightTheme() {
  const { setTheme } = useTheme()
  useEffect(() => {
    setTheme("light")
  }, [setTheme])
  return null
}
