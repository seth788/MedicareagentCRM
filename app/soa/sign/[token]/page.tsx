"use client"

import { use, useState, useEffect } from "react"

const PRODUCTS: { key: string; label: string; description: string }[] = [
  {
    key: "part_d",
    label: "Stand-alone Medicare Prescription Drug Plans (Part D)",
    description:
      "Prescription drug coverage that works alongside Original Medicare or a Medicare Supplement.",
  },
  {
    key: "part_c",
    label: "Medicare Advantage Plans (Part C) and Cost Plans",
    description:
      "All-in-one plans that include hospital, medical, and often prescription drug coverage.",
  },
  {
    key: "dental_vision_hearing",
    label: "Dental/Vision/Hearing Products",
    description: "Standalone benefits for dental, vision, and hearing services.",
  },
  {
    key: "hospital_indemnity",
    label: "Hospital Indemnity Products",
    description: "Products that help pay for hospital stays.",
  },
  {
    key: "medigap",
    label: "Medicare Supplement (Medigap) Products",
    description:
      "Policies that help pay some costs Original Medicare doesn't cover.",
  },
]

export default function SOASignPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "error"; message: string }
    | { status: "success"; soa: Record<string, unknown> }
    | {
        status: "form"
        soa: {
          beneficiaryName: string
          agentName: string
          agentPhone: string | null
          productsPreselected: string[]
          language: string
        }
      }
  >({ status: "loading" })
  const [products, setProducts] = useState<string[]>([])
  const [signerType, setSignerType] = useState<"beneficiary" | "representative">("beneficiary")
  const [repName, setRepName] = useState("")
  const [repRelationship, setRepRelationship] = useState("")
  const [typedName, setTypedName] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch(`/api/soa/verify?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.valid && data.soa) {
          setState({
            status: "form",
            soa: {
              beneficiaryName: data.soa.beneficiaryName,
              agentName: data.soa.agentName,
              agentPhone: data.soa.agentPhone,
              productsPreselected: data.soa.productsPreselected || [],
              language: data.soa.language || "en",
            },
          })
          setProducts(data.soa.productsPreselected || [])
        } else {
          setState({
            status: "error",
            message: data.error || "This link is invalid or has expired.",
          })
        }
      })
      .catch(() => {
        setState({
          status: "error",
          message: "Something went wrong. Please try again or contact your agent.",
        })
      })
  }, [token])

  const toggleProduct = (key: string) => {
    setProducts((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!typedName.trim() || products.length === 0) return
    setSubmitting(true)
    try {
      const res = await fetch("/api/soa/client-sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          typedSignature: typedName.trim(),
          productsSelected: products,
          signerType,
          repName: signerType === "representative" ? repName : undefined,
          repRelationship: signerType === "representative" ? repRelationship : undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        const agentName = state.status === "form" ? state.soa.agentName : ""
        setState({
          status: "success",
          soa: { agentName },
        })
      } else {
        setState({
          status: "error",
          message: data.error || "Failed to submit",
        })
      }
    } catch {
      setState({
        status: "error",
        message: "Failed to submit. Please try again.",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-pulse text-muted-foreground">Loading…</div>
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Unable to load form
          </h1>
          <p className="text-muted-foreground mb-4">{state.message}</p>
          <p className="text-sm text-muted-foreground">
            Please contact your agent for a new link.
          </p>
        </div>
      </div>
    )
  }

  if (state.status === "success") {
    const soa = state.soa as { agentName?: string }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">
            Thank you for signing
          </h1>
          <p className="text-muted-foreground mb-4">
            Your Scope of Appointment has been submitted. Your agent{" "}
            {soa.agentName ? `${soa.agentName} ` : ""}will be in touch.
          </p>
        </div>
      </div>
    )
  }

  const { soa } = state
  const canSubmit = products.length > 0 && typedName.trim().length > 0
  const needsRep =
    signerType === "representative" && (!repName.trim() || !repRelationship.trim())
  const disabled = !canSubmit || submitting || needsRep

  return (
    <div className="min-h-screen bg-background">
      <link
        href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap"
        rel="stylesheet"
      />
      <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
        <h1 className="text-2xl font-semibold text-foreground mb-6">
          Scope of Appointment
        </h1>
        <p className="text-base text-muted-foreground mb-6" style={{ fontSize: "16px" }}>
          The Centers for Medicare and Medicaid Services requires agents to document
          the scope of a marketing appointment prior to any individual sales meeting
          to ensure understanding of what will be discussed between the agent and the
          Medicare beneficiary (or their authorized representative). All information
          provided on this form is confidential.
        </p>
        <p className="text-base text-muted-foreground mb-6" style={{ fontSize: "16px" }}>
          The person who will discuss the products is either employed or contracted by
          a Medicare plan. They do not work directly for the Federal government. This
          individual may also be paid based on your enrollment in a plan. Signing this
          form does NOT obligate you to enroll in a plan, affect your current or
          future enrollment, or enroll you in a Medicare plan.
        </p>

        <div className="mb-6 p-4 rounded-lg bg-muted">
          <p className="text-sm font-medium text-foreground">
            Beneficiary: {soa.beneficiaryName}
          </p>
          <p className="text-sm text-muted-foreground">
            Agent: {soa.agentName}
            {soa.agentPhone ? ` • ${soa.agentPhone}` : ""}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <p className="text-sm font-medium text-foreground mb-3">
              What would you like to discuss? (check all that apply)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRODUCTS.map((p) => (
                <label
                  key={p.key}
                  className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={products.includes(p.key)}
                    onChange={() => toggleProduct(p.key)}
                    className="mt-1 h-4 w-4"
                  />
                  <span className="text-sm">{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-foreground mb-3">
              I am signing as
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer">
                <input
                  type="radio"
                  name="signerType"
                  checked={signerType === "beneficiary"}
                  onChange={() => setSignerType("beneficiary")}
                />
                <span>I am {soa.beneficiaryName}</span>
              </label>
              <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer">
                <input
                  type="radio"
                  name="signerType"
                  checked={signerType === "representative"}
                  onChange={() => setSignerType("representative")}
                />
                <span>I am the authorized representative for {soa.beneficiaryName}</span>
              </label>
            </div>
            {signerType === "representative" && (
              <div className="mt-4 space-y-3">
                <input
                  type="text"
                  placeholder="Your name"
                  value={repName}
                  onChange={(e) => setRepName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-base"
                />
                <input
                  type="text"
                  placeholder="Relationship to beneficiary"
                  value={repRelationship}
                  onChange={(e) => setRepRelationship(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-base"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Type your full legal name
            </label>
            <input
              type="text"
              value={typedName}
              onChange={(e) => setTypedName(e.target.value)}
              placeholder="Full legal name"
              className="w-full px-3 py-3 border rounded-lg text-base"
              style={{ minHeight: "48px" }}
            />
            {typedName && (
              <div
                className="mt-2 py-2 border-b-2 border-foreground/30"
                style={{
                  fontFamily: "'Dancing Script', cursive",
                  fontSize: "32px",
                }}
              >
                {typedName}
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            By selecting &quot;Sign & Submit,&quot; I agree that my typed name will
            serve as the electronic representation of my signature for all purposes on
            this document — the same as a pen and paper signature, in accordance with
            the federal E-SIGN Act.
          </p>

          <button
            type="submit"
            disabled={disabled}
            className="w-full py-4 px-4 bg-primary text-primary-foreground font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {submitting ? "Submitting…" : "Sign & Submit"}
          </button>
        </form>
      </div>
    </div>
  )
}
