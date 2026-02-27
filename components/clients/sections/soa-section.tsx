"use client"

import { ClientSOASection } from "@/components/soa/ClientSOASection"
import type { SectionProps } from "./types"

export function SOASection({ client }: SectionProps) {
  return <ClientSOASection client={client} />
}
