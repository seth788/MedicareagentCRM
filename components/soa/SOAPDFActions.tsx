"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Eye } from "@/components/icons"
import { toast } from "sonner"

interface SOAPDFActionsProps {
  soaId: string
  disabled?: boolean
}

export function SOAPDFActions({ soaId, disabled }: SOAPDFActionsProps) {
  const [loading, setLoading] = useState(false)

  const openPdf = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/soa/${soaId}/signed-url`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      window.open(data.url, "_blank")
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to open PDF"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={openPdf}
      disabled={disabled || loading}
    >
      <Eye className="h-4 w-4 mr-1" />
      View PDF
    </Button>
  )
}
