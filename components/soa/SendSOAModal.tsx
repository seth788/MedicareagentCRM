"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/ui/date-picker"
import { getSettingsProfile } from "@/app/actions/settings"
import {
  getPreferredOrFirstAddress,
  getPreferredOrFirstPhone,
  getPreferredOrFirstEmail,
} from "@/lib/utils"
import { toast } from "sonner"
import type { Client } from "@/lib/types"
import type { SOAProduct } from "@/lib/db/soa"

function formatAddress(addr: { address?: string; unit?: string; city?: string; state?: string; zip?: string } | undefined): string {
  if (!addr) return ""
  const parts = [
    addr.address,
    addr.unit,
    addr.city,
    addr.state,
    addr.zip,
  ].filter((p) => p != null && String(p).trim() !== "")
  return parts.join(", ")
}

const PRODUCT_OPTIONS: { key: SOAProduct; label: string }[] = [
  { key: "part_c", label: "MAPD & Cost Plans" },
  { key: "part_d", label: "PDP's" },
  { key: "medigap", label: "Medicare Supplements" },
  { key: "dental_vision_hearing", label: "Dental-Vision-Hearing Products" },
  { key: "hospital_indemnity", label: "Hospital Indemnity Products" },
]

const INITIAL_CONTACT_OPTIONS = [
  "Phone",
  "Email",
  "Mail",
  "In-Person/Walk-in",
  "Internet/Website",
  "Referral",
]

interface SendSOAModalProps {
  client: Client
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function SendSOAModal({
  client,
  open,
  onOpenChange,
  onSuccess,
}: SendSOAModalProps) {
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [agentName, setAgentName] = useState("")
  const [agentPhone, setAgentPhone] = useState("")
  const [agentNpn, setAgentNpn] = useState("")
  const [language, setLanguage] = useState("en")
  const [products, setProducts] = useState<SOAProduct[]>([])
  const [beneficiaryName, setBeneficiaryName] = useState("")
  const [beneficiaryPhone, setBeneficiaryPhone] = useState("")
  const [beneficiaryAddress, setBeneficiaryAddress] = useState("")
  const [initialContactMethod, setInitialContactMethod] = useState("")
  const [appointmentDate, setAppointmentDate] = useState("")
  const [deliveryMethod, setDeliveryMethod] = useState<"email" | "sms" | "print" | "face_to_face">("email")
  const [selectedEmail, setSelectedEmail] = useState<string>("")
  const [sendError, setSendError] = useState<string | null>(null)

  const clientEmails = client.emails ?? []
  const hasMultipleEmails = clientEmails.length > 1

  useEffect(() => {
    if (open) {
      setSendError(null)
      const pref = getPreferredOrFirstEmail(client)
      const emails = client.emails ?? []
      setSelectedEmail(pref?.value ?? emails[0]?.value ?? "")
      setLoading(true)
      getSettingsProfile().then((profile) => {
        if (profile) {
          setAgentName(`${profile.firstName} ${profile.lastName}`.trim() || "")
          setAgentPhone(profile.phone || "")
          setAgentNpn(profile.npn || "")
        }
        const prefAddr = getPreferredOrFirstAddress(client)
        const prefPhone = getPreferredOrFirstPhone(client)
        setBeneficiaryName(
          [client.firstName, client.lastName].filter(Boolean).join(" ") || ""
        )
        setBeneficiaryPhone(prefPhone?.number ?? "")
        setBeneficiaryAddress(formatAddress(prefAddr))
        setLoading(false)
      })
    }
  }, [open, client])

  const toggleProduct = (key: SOAProduct) => {
    setProducts((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    )
  }

  const handleSend = async () => {
    if (deliveryMethod === "email") {
      const email = selectedEmail?.trim()
      if (!email) {
        toast.error("Client has no email address on file")
        return
      }
    }
    setSending(true)
    setSendError(null)
    try {
      const res = await fetch("/api/soa/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client.id,
          ...(deliveryMethod === "email" && selectedEmail && { email: selectedEmail.trim() }),
          agentName: agentName.trim(),
          agentPhone: agentPhone.trim() || null,
          agentNpn: agentNpn.trim() || null,
          language,
          productsPreselected: products,
          beneficiaryName: beneficiaryName.trim(),
          beneficiaryPhone: beneficiaryPhone.trim() || null,
          beneficiaryAddress: beneficiaryAddress.trim() || null,
          initialContactMethod: initialContactMethod || null,
          appointmentDate: appointmentDate || null,
          deliveryMethod,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        const errMsg = data.error || "Failed to send SOA"
        setSendError(errMsg)
        toast.error(errMsg)
        return
      }
      setSendError(null)
      toast.success("SOA sent successfully")
      if (data.signUrl) {
        toast.info("Link copied to clipboard", {
          description: "You can also share the link manually.",
        })
        try {
          await navigator.clipboard.writeText(data.signUrl)
        } catch {
          // ignore
        }
      }
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : "Failed to send SOA"
      setSendError(errMsg)
      toast.error(errMsg)
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Send Scope of Appointment</DialogTitle>
          <DialogDescription>
            Pre-fill the SOA form and send it to {client.firstName} for signing.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {loading ? (
            <p className="text-sm text-muted-foreground p-4">Loading…</p>
          ) : (
            <div className="space-y-6 p-4 pr-6">
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Agent Info</h4>
                <div className="grid gap-2">
                  <Label>Agent Name</Label>
                  <Input
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                    placeholder="Your name"
                  />
                  <Label>Agent Phone</Label>
                  <Input
                    value={agentPhone}
                    onChange={(e) => setAgentPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    type="tel"
                  />
                  <Label>Agent NPN</Label>
                  <Input
                    value={agentNpn}
                    onChange={(e) => setAgentNpn(e.target.value)}
                    placeholder="National Producer Number"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium">What You Want to Discuss</h4>
                <div className="grid grid-cols-2 gap-2">
                  {PRODUCT_OPTIONS.map((p) => (
                    <label key={p.key} className="flex items-center gap-2">
                      <Checkbox
                        checked={products.includes(p.key)}
                        onCheckedChange={() => toggleProduct(p.key)}
                      />
                      <span className="text-sm">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Beneficiary Information</h4>
                <div className="grid gap-2">
                  <Label>Beneficiary Name</Label>
                  <Input
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    placeholder="Full name"
                  />
                  <Label>Beneficiary Phone</Label>
                  <Input
                    value={beneficiaryPhone}
                    onChange={(e) => setBeneficiaryPhone(e.target.value)}
                    placeholder="Phone"
                    type="tel"
                  />
                  <Label>Beneficiary Address</Label>
                  <Input
                    value={beneficiaryAddress}
                    onChange={(e) => setBeneficiaryAddress(e.target.value)}
                    placeholder="Street, city, state, zip"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Appointment Details</h4>
                <div className="grid gap-2">
                  <Label>Initial Contact Method</Label>
                  <Select value={initialContactMethod} onValueChange={setInitialContactMethod}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {INITIAL_CONTACT_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div>
                    <Label>Appointment Date</Label>
                    <DatePicker
                      value={appointmentDate}
                      onChange={setAppointmentDate}
                      placeholder="You can add this later when you countersign."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      You can add this later when you countersign.
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-medium">How do you want to send the SOA?</h4>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryMethod === "email"}
                      onChange={() => setDeliveryMethod("email")}
                    />
                    <span>Email</span>
                  </label>
                  {deliveryMethod === "email" && (
                    <div className="pl-6 space-y-2">
                      {hasMultipleEmails ? (
                        <>
                          <Label>Send to</Label>
                          <Select value={selectedEmail} onValueChange={setSelectedEmail}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose email address" />
                            </SelectTrigger>
                            <SelectContent>
                              {clientEmails.map((e) => (
                                <SelectItem key={e.id} value={e.value}>
                                  {e.value}
                                  {e.isPreferred && " (preferred)"}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      ) : (
                        clientEmails.length === 1 && (
                          <p className="text-sm text-muted-foreground">
                            Sending to {clientEmails[0].value}
                          </p>
                        )
                      )}
                    </div>
                  )}
                  <label className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                    <input type="radio" name="delivery" disabled />
                    <span>SMS (Coming soon)</span>
                  </label>
                  <label className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                    <input type="radio" name="delivery" disabled />
                    <span>Print (post-MVP)</span>
                  </label>
                  <label className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                    <input type="radio" name="delivery" disabled />
                    <span>Face-to-Face (post-MVP)</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
        {sendError && (
          <div className="px-4 py-3 mx-4 mb-2 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            {sendError}
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={handleSend} disabled={loading || sending}>
            {sending ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
