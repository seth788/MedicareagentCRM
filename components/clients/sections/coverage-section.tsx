"use client"

import { useState, useCallback, useEffect } from "react"
import { format, isBefore, addDays, startOfDay } from "date-fns"
import { parseLocalDate } from "@/lib/date-utils"
import {
  Plus,
  FileText,
  ChevronDown,
  MoreVertical,
  Pencil,
  Trash2,
  CheckmarkBadge,
  Loading01,
  Exchange01,
  CancelSquare,
  TaskRemove01,
  Unavailable,
  UserMinus02,
  UserBlock02,
  Appointment02,
  Mailbox01,
  Sent,
  Signature,
} from "@/components/icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCRMStore } from "@/lib/store"
import { toast } from "sonner"
import type { Client, Coverage } from "@/lib/types"
import type { CoveragePlanType } from "@/lib/types"
import {
  COVERAGE_STATUS_OPTIONS,
  WRITTEN_AS_OPTIONS,
  ELECTION_PERIOD_OPTIONS,
  COVERAGE_PLAN_TYPE_OPTIONS,
  BILLING_METHOD_OPTIONS,
  DRAFT_DAY_OPTIONS,
  ENROLLMENT_METHOD_OPTIONS,
  NEW_TO_BOOK_OR_REWRITE_OPTIONS,
  isActiveCoverageStatus,
} from "@/lib/coverage-options"
import type { SectionProps } from "./types"
import { getPreferredOrFirstAddress } from "@/lib/utils"
import { normalizeCountyToPlainName } from "@/lib/utils"
import { fetchCarriersForLocation, fetchPlansForCarrier } from "@/app/actions/medicare-plans"
import type { MedicarePlanOption } from "@/lib/db/medicare-plans"
import { MED_SUPP_CARRIERS, MED_SUPP_PLANS, MED_SUPP_PLANS_GROUPED } from "@/lib/med-supp-options"

type StatusStyle = {
  Icon: React.ComponentType<{ className?: string; size?: number }>
  pillClass: string
  cardAccentClass: string
}

const PENDING_STATUSES = ["Pending/Submitted", "Pending (not agent of record)"]

function isEffectiveDateReached(effectiveDateStr: string): boolean {
  if (!effectiveDateStr) return false
  try {
    const effDate = parseLocalDate(effectiveDateStr)
    const tomorrow = addDays(startOfDay(new Date()), 1)
    return isBefore(effDate, tomorrow)
  } catch {
    return false
  }
}

function maybeAutoIssueCoverage(cov: Coverage, autoIssueEnabled: boolean): Coverage {
  if (!autoIssueEnabled) return cov
  if (!PENDING_STATUSES.includes(cov.status)) return cov
  if (!isEffectiveDateReached(cov.effectiveDate)) return cov
  const newStatus =
    cov.status === "Pending (not agent of record)"
      ? "Active (not agent of record)"
      : "Active"
  return { ...cov, status: newStatus, commissionStatus: "paid_full" }
}

const COVERAGE_STATUS_STYLES: Record<string, StatusStyle> = {
"Active": { Icon: CheckmarkBadge, pillClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30", cardAccentClass: "border border-emerald-500" },
"Active (not agent of record)": { Icon: CheckmarkBadge, pillClass: "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30", cardAccentClass: "border border-teal-500" },
"Active (non-commissionable)": { Icon: CheckmarkBadge, pillClass: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30", cardAccentClass: "border border-cyan-500" },
"Pending/Submitted": { Icon: Loading01, pillClass: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30", cardAccentClass: "border border-yellow-500" },
"Pending (not agent of record)": { Icon: Loading01, pillClass: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30", cardAccentClass: "border border-yellow-500" },
  "Kit Mailed": { Icon: Mailbox01, pillClass: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30", cardAccentClass: "border border-violet-500" },
  "Kit Emailed": { Icon: Sent, pillClass: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30", cardAccentClass: "border border-violet-500" },
  "eSign Sent": { Icon: Signature, pillClass: "bg-violet-500/15 text-violet-700 dark:text-violet-400 border-violet-500/30", cardAccentClass: "border border-violet-500" },
"Replaced": { Icon: Exchange01, pillClass: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30", cardAccentClass: "border border-blue-500" },
"Canceled": { Icon: CancelSquare, pillClass: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30", cardAccentClass: "border border-slate-400" },
"Disenrolled": { Icon: TaskRemove01, pillClass: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30", cardAccentClass: "border border-orange-500" },
"Declined": { Icon: Unavailable, pillClass: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30", cardAccentClass: "border border-red-500" },
"Withdrawn": { Icon: UserMinus02, pillClass: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/30", cardAccentClass: "border border-zinc-400" },
"Terminated": { Icon: UserBlock02, pillClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30", cardAccentClass: "border border-rose-500" },
}

const DEFAULT_STATUS_STYLE: StatusStyle = {
  Icon: FileText,
  pillClass: "bg-muted text-muted-foreground border-border",
  cardAccentClass: "border border-border",
}

function getCoverageStatusStyle(status: string): StatusStyle {
  return (status && COVERAGE_STATUS_STYLES[status]) || DEFAULT_STATUS_STYLE
}

function emptyCoverageForm(planType: CoveragePlanType) {
  return {
    planType,
    carrier: "",
    planName: "",
    planId: "",
    status: "",
    applicationDate: "",
    effectiveDate: "",
    writtenAs: "",
    electionPeriod: "",
    memberPolicyNumber: "",
    replacingCoverageId: "",
    applicationId: "",
    hraCollected: false,
    notes: "",
    premium: "",
    bonus: "",
    billingMethod: "",
    draftDay: "",
    enrollmentMethod: "",
    newToBookOrRewrite: "",
  }
}

function coverageToForm(c: Coverage) {
  return {
    planType: c.planType,
    carrier: c.carrier,
    planName: c.planName,
    planId: c.planId ?? "",
    status: c.status,
    applicationDate: c.applicationDate?.split("T")[0] ?? "",
    effectiveDate: c.effectiveDate?.split("T")[0] ?? "",
    writtenAs: c.writtenAs,
    electionPeriod: c.electionPeriod,
    memberPolicyNumber: c.memberPolicyNumber,
    replacingCoverageId: c.replacingCoverageId ?? "",
    applicationId: c.applicationId,
    hraCollected: c.hraCollected,
    notes: c.notes ?? "",
    premium: c.premium != null ? String(c.premium) : "",
    bonus: c.bonus != null ? String(c.bonus) : "",
    billingMethod: c.billingMethod ?? "",
    draftDay: c.draftDay ?? "",
    enrollmentMethod: c.enrollmentMethod ?? "",
    newToBookOrRewrite: c.newToBookOrRewrite ?? "",
  }
}

function formToCoverage(
  form: ReturnType<typeof emptyCoverageForm>,
  id: string,
  existing?: Coverage
): Coverage {
  // When adding/editing a policy with an issued (Active) status, default commission to paid_full
  const commissionStatus =
    isActiveCoverageStatus(form.status)
      ? (existing?.commissionStatus ?? "paid_full")
      : existing?.commissionStatus

  const parseNum = (s: string) => {
    if (!s?.trim()) return undefined
    const n = parseFloat(String(s).replace(/[^0-9.-]/g, ""))
    return Number.isNaN(n) ? undefined : n
  }

  return {
    id,
    planType: form.planType as CoveragePlanType,
    carrier: form.carrier,
    planName: form.planName,
    planId: form.planId || undefined,
    status: form.status,
    applicationDate: form.applicationDate || "",
    effectiveDate: form.effectiveDate || "",
    writtenAs: form.writtenAs,
    electionPeriod: form.electionPeriod,
    memberPolicyNumber: form.memberPolicyNumber,
    replacingCoverageId: form.replacingCoverageId || undefined,
    applicationId: form.applicationId,
    hraCollected: form.hraCollected,
    notes: form.notes.trim() || undefined,
    commissionStatus,
    premium: parseNum(form.premium),
    bonus: parseNum(form.bonus),
    billingMethod: form.billingMethod?.trim() || undefined,
    draftDay: form.draftDay?.trim() || undefined,
    enrollmentMethod: form.enrollmentMethod?.trim() || undefined,
    newToBookOrRewrite: form.newToBookOrRewrite?.trim() || undefined,
    createdAt: existing?.createdAt,
    updatedAt: existing?.updatedAt,
  }
}

export function CoverageSection({ client }: SectionProps) {
  const { updateClient, addActivity, currentAgent, autoIssueApplications } = useCRMStore()
  const coverages = client.coverages ?? []

  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [addStep, setAddStep] = useState<1 | 2>(1)
  const [addPlanType, setAddPlanType] = useState<CoveragePlanType | "">("")
  const [addForm, setAddForm] = useState(emptyCoverageForm("MAPD"))
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null)
  const [carriers, setCarriers] = useState<string[]>([])
  const [plans, setPlans] = useState<MedicarePlanOption[]>([])
  const [loadingCarriers, setLoadingCarriers] = useState(false)
  const [loadingPlans, setLoadingPlans] = useState(false)

  const resolvedAddress =
    selectedAddressId != null
      ? (client.addresses ?? []).find((a) => a.id === selectedAddressId)
      : getPreferredOrFirstAddress(client)
  const normalizedCounty = normalizeCountyToPlainName(resolvedAddress?.county)
  const hasState = Boolean(resolvedAddress?.state?.trim())
  const isMedSupp = addPlanType === "Med Supp"
  const canFetchPlans = Boolean(addStep === 2 && addPlanType && !isMedSupp && hasState)

  // Med Supp: use hardcoded carriers and plans
  const medSuppPlansAsOptions: MedicarePlanOption[] = MED_SUPP_PLANS.map((p) => ({
    id: p,
    planName: p,
    contractId: "",
  }))

  useEffect(() => {
    if (addStep !== 2 || !addPlanType) return
    if (isMedSupp) {
      setCarriers([...MED_SUPP_CARRIERS])
      return
    }
    if (!resolvedAddress?.state) {
      setCarriers([])
      return
    }
    setLoadingCarriers(true)
    fetchCarriersForLocation(
      addPlanType as "MAPD" | "PDP",
      resolvedAddress.state.trim(),
      normalizedCounty ?? resolvedAddress.county ?? null
    )
      .then((r) => {
        setCarriers(r.carriers ?? [])
        if (r.error) toast.error(`Could not load carriers: ${r.error}`)
      })
      .catch(() => {
        setCarriers([])
        toast.error("Failed to load carriers")
      })
      .finally(() => setLoadingCarriers(false))
  }, [addStep, addPlanType, isMedSupp, resolvedAddress?.state, resolvedAddress?.county, normalizedCounty])

  useEffect(() => {
    if (addStep !== 2 || !addPlanType) return
    if (isMedSupp) {
      setPlans(medSuppPlansAsOptions)
      return
    }
    if (!canFetchPlans || !addForm.carrier.trim() || !resolvedAddress?.state) {
      setPlans([])
      return
    }
    setLoadingPlans(true)
    fetchPlansForCarrier(
      addPlanType as "MAPD" | "PDP",
      resolvedAddress.state.trim(),
      normalizedCounty ?? resolvedAddress.county ?? null,
      addForm.carrier.trim()
    )
      .then((r) => setPlans(r.plans ?? []))
      .finally(() => setLoadingPlans(false))
  }, [
    addStep,
    addPlanType,
    isMedSupp,
    canFetchPlans,
    resolvedAddress?.state,
    resolvedAddress?.county,
    normalizedCounty,
    addForm.carrier,
  ])

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyCoverageForm("MAPD"))
  const [editSelectedAddressId, setEditSelectedAddressId] = useState<string | null>(null)
  const [editCarriers, setEditCarriers] = useState<string[]>([])
  const [editPlans, setEditPlans] = useState<MedicarePlanOption[]>([])
  const [editLoadingCarriers, setEditLoadingCarriers] = useState(false)
  const [editLoadingPlans, setEditLoadingPlans] = useState(false)
  const [editChangeCarrier, setEditChangeCarrier] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [addressRequiredOpen, setAddressRequiredOpen] = useState(false)

  const addresses = client.addresses ?? []
  const hasAddress = addresses.length > 0
  const resolvedEditAddress =
    editingId != null
      ? editSelectedAddressId != null
        ? addresses.find((a) => a.id === editSelectedAddressId)
        : addresses.length === 1
          ? addresses[0]
          : undefined
      : undefined
  const normalizedEditCounty = normalizeCountyToPlainName(resolvedEditAddress?.county)
  const isEditMedSupp = editForm.planType === "Med Supp"
  const canFetchEditPlans = Boolean(
    editingId &&
      (isEditMedSupp ||
        (resolvedEditAddress?.state?.trim() &&
          (editForm.planType === "MAPD" || editForm.planType === "PDP")))
  )

  const editMedSuppPlansAsOptions: MedicarePlanOption[] = MED_SUPP_PLANS.map((p) => ({
    id: p,
    planName: p,
    contractId: "",
  }))

  useEffect(() => {
    if (!editingId || !canFetchEditPlans) {
      if (!editingId) setEditCarriers([])
      return
    }
    if (isEditMedSupp) {
      setEditCarriers([...MED_SUPP_CARRIERS])
      return
    }
    if (!resolvedEditAddress?.state) {
      setEditCarriers([])
      return
    }
    setEditLoadingCarriers(true)
    fetchCarriersForLocation(
      editForm.planType as "MAPD" | "PDP",
      resolvedEditAddress.state.trim(),
      normalizedEditCounty ?? resolvedEditAddress.county ?? null
    )
      .then((r) => {
        setEditCarriers(r.carriers ?? [])
        if (r.error) toast.error(`Could not load carriers: ${r.error}`)
      })
      .catch(() => {
        setEditCarriers([])
        toast.error("Failed to load carriers")
      })
      .finally(() => setEditLoadingCarriers(false))
  }, [
    editingId,
    canFetchEditPlans,
    isEditMedSupp,
    editForm.planType,
    resolvedEditAddress?.state,
    resolvedEditAddress?.county,
    normalizedEditCounty,
  ])

  const carrierForPlans = editChangeCarrier !== null ? editChangeCarrier : editForm.carrier
  useEffect(() => {
    if (!editingId || !canFetchEditPlans) {
      if (!editingId) setEditPlans([])
      return
    }
    if (isEditMedSupp) {
      setEditPlans(editMedSuppPlansAsOptions)
      return
    }
    if (!carrierForPlans.trim() || !resolvedEditAddress?.state) {
      setEditPlans([])
      return
    }
    setEditLoadingPlans(true)
    fetchPlansForCarrier(
      editForm.planType as "MAPD" | "PDP",
      resolvedEditAddress.state.trim(),
      normalizedEditCounty ?? resolvedEditAddress.county ?? null,
      carrierForPlans.trim()
    )
      .then((r) => setEditPlans(r.plans ?? []))
      .finally(() => setEditLoadingPlans(false))
  }, [
    editingId,
    canFetchEditPlans,
    isEditMedSupp,
    editForm.planType,
    resolvedEditAddress?.state,
    resolvedEditAddress?.county,
    normalizedEditCounty,
    carrierForPlans,
  ])

  const activeCoverages = coverages.filter((c) => isActiveCoverageStatus(c.status))

  const logActivity = useCallback(
    (description: string) => {
      addActivity({
        id: `act-${Date.now()}`,
        relatedType: "Client",
        relatedId: client.id,
        type: "coverage",
        description,
        createdAt: new Date().toISOString(),
        createdBy: currentAgent,
      })
    },
    [addActivity, client.id, currentAgent]
  )

  const handleAddOpen = useCallback(() => {
    setAddStep(1)
    setAddPlanType("")
    setAddForm(emptyCoverageForm("MAPD"))
    setSelectedAddressId(null)
    setCarriers([])
    setPlans([])
    setAddDialogOpen(true)
  }, [])

  const handleAddClick = useCallback(() => {
    handleAddOpen()
  }, [handleAddOpen])

  const handleAddPlanTypeSelect = useCallback(
    (value: CoveragePlanType) => {
      if ((value === "MAPD" || value === "PDP") && !hasAddress) {
        setAddressRequiredOpen(true)
        return
      }
      setAddPlanType(value)
      setAddForm(emptyCoverageForm(value))
      setPlans([])
      setAddStep(2)
    },
    [hasAddress]
  )

  const handleAddAddressChange = useCallback((addressId: string | null) => {
    setSelectedAddressId(addressId)
    setAddForm((f) => ({ ...f, carrier: "", planName: "", planId: "" }))
    setPlans([])
  }, [])

  const handleAddSubmit = useCallback(() => {
    const isSupp = addPlanType === "Med Supp"
    const needsPremium = isSupp && !addForm.premium?.trim()
    if (!addForm.carrier.trim() || !addForm.planName.trim() || !addForm.status || !addForm.effectiveDate) {
      toast.error("Please fill required fields: Company/Carrier, Plan, Status, Effective date")
      return
    }
    if (needsPremium) {
      toast.error("Please enter the monthly premium")
      return
    }
    let newCoverage = formToCoverage(addForm, crypto.randomUUID())
    newCoverage = maybeAutoIssueCoverage(newCoverage, autoIssueApplications)
    const nextCoverages = [...coverages, newCoverage]
    updateClient(client.id, { coverages: nextCoverages })
    logActivity(`Coverage added: ${newCoverage.carrier} ${newCoverage.planName}`)
    toast.success("Coverage added")
    setAddDialogOpen(false)
  }, [addForm, coverages, client.id, updateClient, logActivity, autoIssueApplications])

  const handleEditStart = useCallback((c: Coverage) => {
    setExpandedId(c.id)
    setEditingId(c.id)
    setEditForm(coverageToForm(c))
    setEditChangeCarrier(null)
    const addrs = client.addresses ?? []
    if (addrs.length > 1) {
      setEditSelectedAddressId(null)
      setEditCarriers([])
      setEditPlans([])
    } else if (addrs.length === 1) {
      setEditSelectedAddressId(addrs[0].id)
    } else {
      setEditSelectedAddressId(null)
    }
  }, [client.addresses])

  const handleEditSave = useCallback(() => {
    if (!editingId) return
    const cov = coverages.find((x) => x.id === editingId)
    if (!cov) return
    if (!editForm.carrier.trim() || !editForm.planName.trim() || !editForm.status || !editForm.effectiveDate) {
      toast.error("Please fill required fields")
      return
    }
    if (editForm.planType === "Med Supp" && !editForm.premium?.trim()) {
      toast.error("Please enter the monthly premium")
      return
    }
    let updated = formToCoverage(editForm, cov.id, cov)
    updated = maybeAutoIssueCoverage(updated, autoIssueApplications)
    const nextCoverages = coverages.map((x) => (x.id === editingId ? updated : x))
    updateClient(client.id, { coverages: nextCoverages })
    logActivity(`Coverage updated: ${updated.carrier} ${updated.planName}`)
    toast.success("Coverage updated")
    setEditingId(null)
    setEditSelectedAddressId(null)
    setEditCarriers([])
    setEditPlans([])
    setEditChangeCarrier(null)
  }, [editingId, editForm, coverages, client.id, updateClient, logActivity, autoIssueApplications])

  const handleEditCancel = useCallback(() => {
    setEditingId(null)
    setEditSelectedAddressId(null)
    setEditCarriers([])
    setEditPlans([])
    setEditChangeCarrier(null)
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteConfirmId) return
    const toRemove = coverages.find((c) => c.id === deleteConfirmId)
    const nextCoverages = coverages.filter((c) => c.id !== deleteConfirmId)
    updateClient(client.id, { coverages: nextCoverages })
    if (toRemove) logActivity(`Coverage removed: ${toRemove.carrier} ${toRemove.planName}`)
    toast.success("Coverage removed")
    setDeleteConfirmId(null)
    setExpandedId((id) => (id === deleteConfirmId ? null : id))
    setEditingId((id) => (id === deleteConfirmId ? null : id))
    if (editingId === deleteConfirmId) {
      setEditSelectedAddressId(null)
      setEditCarriers([])
      setEditPlans([])
      setEditChangeCarrier(null)
    }
  }, [deleteConfirmId, editingId, coverages, client.id, updateClient, logActivity])

  const getReplacingLabel = (replacingId: string) => {
    const c = coverages.find((x) => x.id === replacingId)
    return c ? `${c.carrier} - ${c.planName}` : replacingId
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/30 py-4">
        <CardTitle className="flex items-center gap-2.5 text-sm font-semibold sm:text-base">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chart-3/10">
            <FileText className="h-4 w-4 text-chart-3" />
          </div>
          {coverages.length > 0 ? "Coverage" : "No Coverage on File"}
        </CardTitle>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <Button variant="outline" size="sm" onClick={handleAddClick}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
          <DialogContent className="max-h-[100dvh] overflow-y-auto sm:max-h-[90vh] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{addStep === 1 ? "Add Coverage" : "Add Coverage — Details"}</DialogTitle>
            </DialogHeader>
            {addStep === 1 ? (
              <div className="py-4">
                <p className="mb-4 text-sm text-muted-foreground">Select plan type</p>
                <div className="flex flex-wrap gap-3">
                  {COVERAGE_PLAN_TYPE_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={addPlanType === opt.value ? "default" : "outline"}
                      onClick={() => handleAddPlanTypeSelect(opt.value)}
                      className="min-h-[44px] flex-1 basis-0 touch-manipulation sm:flex-initial sm:basis-auto sm:min-h-0"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <AddCoverageForm
                client={client}
                planType={addPlanType as CoveragePlanType}
                form={addForm}
                setForm={setAddForm}
                resolvedAddress={resolvedAddress}
                normalizedCounty={normalizedCounty}
                selectedAddressId={selectedAddressId}
                onAddressChange={handleAddAddressChange}
                carriers={carriers}
                plans={plans}
                loadingCarriers={loadingCarriers}
                loadingPlans={loadingPlans}
                activeCoverages={activeCoverages}
                getReplacingLabel={getReplacingLabel}
              />
            )}
            {addStep === 2 && (
              <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button variant="outline" onClick={() => setAddStep(1)} className="min-h-[44px] w-full touch-manipulation sm:min-h-0 sm:w-auto">
                  Back
                </Button>
                <Button
                  onClick={handleAddSubmit}
                  disabled={
                    !addForm.carrier.trim() ||
                    !addForm.planName.trim() ||
                    !addForm.status ||
                    !addForm.effectiveDate ||
                    (addPlanType === "Med Supp" && !addForm.premium?.trim())
                  }
                  className="min-h-[44px] w-full touch-manipulation sm:min-h-0 sm:w-auto"
                >
                  Save Coverage
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 sm:pt-6">
        {coverages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
              <FileText className="h-7 w-7 text-muted-foreground/50" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              No coverage information on file yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click &quot;Add Coverage&quot; above to add plan details.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {coverages.map((cov) => (
              <CoverageCard
                key={cov.id}
                coverage={cov}
                client={client}
                isExpanded={expandedId === cov.id}
                isEditing={editingId === cov.id}
                editForm={editForm}
                setEditForm={setEditForm}
                onToggleExpand={() => setExpandedId((id) => (id === cov.id ? null : cov.id))}
                onEditStart={() => handleEditStart(cov)}
                onEditSave={handleEditSave}
                onEditCancel={handleEditCancel}
                onDeleteClick={() => setDeleteConfirmId(cov.id)}
                getReplacingLabel={getReplacingLabel}
                activeCoverages={activeCoverages}
                addresses={addresses}
                resolvedEditAddress={resolvedEditAddress}
                editSelectedAddressId={editSelectedAddressId}
                onEditAddressChange={setEditSelectedAddressId}
                editCarriers={editCarriers}
                editPlans={editPlans}
                editLoadingCarriers={editLoadingCarriers}
                editLoadingPlans={editLoadingPlans}
                onEditChangeCarrierChange={setEditChangeCarrier}
              />
            ))}
          </div>
        )}
      </CardContent>
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove coverage?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the selected plan from the client&apos;s profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={addressRequiredOpen} onOpenChange={setAddressRequiredOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Address required</AlertDialogTitle>
            <AlertDialogDescription>
              You need to add an address before you can add coverage in order to view plans in the correct area.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAddressRequiredOpen(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}

function AddCoverageForm({
  client,
  planType,
  form,
  setForm,
  resolvedAddress,
  normalizedCounty,
  selectedAddressId,
  onAddressChange,
  carriers,
  plans,
  loadingCarriers,
  loadingPlans,
  activeCoverages,
  getReplacingLabel,
}: {
  client: SectionProps["client"]
  planType: CoveragePlanType
  form: ReturnType<typeof emptyCoverageForm>
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyCoverageForm>>>
  resolvedAddress: ReturnType<typeof getPreferredOrFirstAddress>
  normalizedCounty: string | null
  selectedAddressId: string | null
  onAddressChange: (addressId: string | null) => void
  carriers: string[]
  plans: MedicarePlanOption[]
  loadingCarriers: boolean
  loadingPlans: boolean
  activeCoverages: Coverage[]
  getReplacingLabel: (id: string) => string
}) {
  const addresses = client.addresses ?? []
  const hasMultipleAddresses = addresses.length > 1
  const hasState = Boolean(resolvedAddress?.state?.trim())
  const isMedSupp = planType === "Med Supp"
  const canShowPlans = hasState || isMedSupp
  const needsCounty = hasState && !normalizedCounty && !isMedSupp

  return (
    <div className="grid max-h-[60vh] gap-3 overflow-y-auto px-2 py-2">
      {!resolvedAddress && (
        <p className="text-sm text-muted-foreground">
          Add an address to this client to see plans by location.
        </p>
      )}
      {hasMultipleAddresses && resolvedAddress && !isMedSupp && (
        <div>
          <Label>View plans for</Label>
          <Select
            value={selectedAddressId ?? (resolvedAddress?.id ?? "_")}
            onValueChange={(v) => onAddressChange(v === "_" ? null : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select address..." />
            </SelectTrigger>
            <SelectContent>
              {addresses.map((addr) => (
                <SelectItem key={addr.id} value={addr.id}>
                  {addr.isPreferred ? "Preferred: " : ""}
                  {addr.type} — {addr.city}, {addr.state}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      {needsCounty && (
        <p className="text-sm text-muted-foreground">
          Add county to this address for county-specific plans, or use the list below for state-wide plans.
        </p>
      )}
      {canShowPlans && (
        <>
          <div>
            <Label>Company</Label>
            <Select
              value={form.carrier ? form.carrier : "_"}
              onValueChange={(v) => {
                setForm((f) => ({ ...f, carrier: v === "_" ? "" : v, planName: "", planId: "" }))
              }}
              disabled={loadingCarriers}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingCarriers ? "Loading..." : "Select..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Select...</SelectItem>
                {carriers.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Plan</Label>
            <Select
              value={form.planId || "_"}
              onValueChange={(v) => {
                if (v === "_") {
                  setForm((f) => ({ ...f, planId: "", planName: "" }))
                  return
                }
                const plan = plans.find((p) => p.id === v)
                const displayName = plan?.contractId
                  ? `${plan.planName} (${plan.contractId})`
                  : (plan?.planName ?? "")
                setForm((f) => ({
                  ...f,
                  planId: v,
                  planName: displayName,
                }))
              }}
              disabled={!form.carrier.trim() || loadingPlans}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !form.carrier.trim()
                      ? "Select company first"
                      : loadingPlans
                        ? "Loading..."
                        : "Select..."
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Select...</SelectItem>
                {isMedSupp
                  ? MED_SUPP_PLANS_GROUPED.map((group) => (
                      <SelectGroup key={group.label ?? "standard"}>
                        {group.label && (
                          <SelectLabel className="text-muted-foreground">
                            --{group.label}--
                          </SelectLabel>
                        )}
                        {group.plans.map((planName) => (
                          <SelectItem key={planName} value={planName}>
                            {planName}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))
                  : plans.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.contractId ? `${p.planName} (${p.contractId})` : p.planName}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      <div>
        <Label>Status *</Label>
        <Select value={form.status || "_"} onValueChange={(v) => setForm((f) => ({ ...f, status: v === "_" ? "" : v }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">Select...</SelectItem>
            <SelectGroup>
              {COVERAGE_STATUS_OPTIONS.filter(
                (o) => !o.separator && !["Kit Mailed", "Kit Emailed", "eSign Sent"].includes(o.value)
              ).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-muted-foreground">— PRE SUBMISSION —</SelectLabel>
              <SelectItem value="Kit Mailed">Kit Mailed</SelectItem>
              <SelectItem value="Kit Emailed">Kit Emailed</SelectItem>
              <SelectItem value="eSign Sent">eSign Sent</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label>Application date</Label>
          <DatePicker
            value={form.applicationDate}
            onChange={(v) => setForm((f) => ({ ...f, applicationDate: v }))}
            placeholder="Pick a date"
            className="min-h-[44px] sm:min-h-0"
          />
        </div>
        <div>
          <Label>Effective date *</Label>
          <DatePicker
            value={form.effectiveDate}
            onChange={(v) => setForm((f) => ({ ...f, effectiveDate: v }))}
            placeholder="Pick a date"
            className="min-h-[44px] sm:min-h-0"
          />
        </div>
      </div>
      <div>
        <Label>Billing method</Label>
        <Select
          value={form.billingMethod || "_"}
          onValueChange={(v) => setForm((f) => ({ ...f, billingMethod: v === "_" ? "" : v }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">Select...</SelectItem>
            {BILLING_METHOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isMedSupp && (
        <>
          <div>
            <Label>Premium * (monthly)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                value={form.premium}
                onChange={(e) => setForm((f) => ({ ...f, premium: e.target.value }))}
                placeholder="0.00"
                className="pl-7 min-h-[44px] sm:min-h-0"
              />
            </div>
          </div>
          <div>
            <Label>Bonus</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                value={form.bonus}
                onChange={(e) => setForm((f) => ({ ...f, bonus: e.target.value }))}
                placeholder="0.00"
                className="pl-7 min-h-[44px] sm:min-h-0"
              />
            </div>
          </div>
          <div>
            <Label>Draft day</Label>
            <Select
              value={form.draftDay || "_"}
              onValueChange={(v) => setForm((f) => ({ ...f, draftDay: v === "_" ? "" : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Select...</SelectItem>
                {DRAFT_DAY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      <div>
        <Label>{isMedSupp ? "Policy number" : "Member / Policy #"}</Label>
        <Input
          value={form.memberPolicyNumber}
          onChange={(e) => setForm((f) => ({ ...f, memberPolicyNumber: e.target.value }))}
          placeholder={isMedSupp ? "Policy number" : "Member or policy number"}
        />
      </div>
      <div>
        <Label>Replacing</Label>
        <Select
          value={form.replacingCoverageId || "_"}
          onValueChange={(v) => setForm((f) => ({ ...f, replacingCoverageId: v === "_" ? "" : v }))}
          disabled={activeCoverages.length === 0}
        >
          <SelectTrigger>
            <SelectValue placeholder={activeCoverages.length === 0 ? "No active plan" : "Select..."} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">Select...</SelectItem>
            {activeCoverages.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {getReplacingLabel(c.id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isMedSupp && (
        <>
          <div>
            <Label>Enrollment method</Label>
            <Select
              value={form.enrollmentMethod || "_"}
              onValueChange={(v) => setForm((f) => ({ ...f, enrollmentMethod: v === "_" ? "" : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Select...</SelectItem>
                {ENROLLMENT_METHOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>New to book or rewrite</Label>
            <Select
              value={form.newToBookOrRewrite || "_"}
              onValueChange={(v) => setForm((f) => ({ ...f, newToBookOrRewrite: v === "_" ? "" : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Select...</SelectItem>
                {NEW_TO_BOOK_OR_REWRITE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      {!isMedSupp && (
        <>
          <div>
            <Label>Written as</Label>
            <Select
              value={form.writtenAs || "_"}
              onValueChange={(v) => setForm((f) => ({ ...f, writtenAs: v === "_" ? "" : v }))}
            >
              <SelectTrigger className="min-h-[44px] sm:min-h-0">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Select...</SelectItem>
                {WRITTEN_AS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Election period</Label>
            <Select
              value={form.electionPeriod || "_"}
              onValueChange={(v) => setForm((f) => ({ ...f, electionPeriod: v === "_" ? "" : v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Select...</SelectItem>
                {ELECTION_PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Application ID</Label>
            <Input
              value={form.applicationId}
              onChange={(e) => setForm((f) => ({ ...f, applicationId: e.target.value }))}
              placeholder="Application ID"
            />
          </div>
        </>
      )}
      {planType === "MAPD" && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="add-hra"
            checked={form.hraCollected}
            onCheckedChange={(checked) => setForm((f) => ({ ...f, hraCollected: !!checked }))}
          />
          <Label htmlFor="add-hra" className="font-normal cursor-pointer">
            HRA collected
          </Label>
        </div>
      )}
      <div>
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Notes about this enrollment"
          rows={3}
        />
      </div>
    </div>
  )
}

function CoverageCard({
  coverage,
  client,
  isExpanded,
  isEditing,
  editForm,
  setEditForm,
  onToggleExpand,
  onEditStart,
  onEditSave,
  onEditCancel,
  onDeleteClick,
  getReplacingLabel,
  activeCoverages,
  addresses,
  resolvedEditAddress,
  editSelectedAddressId,
  onEditAddressChange,
  editCarriers,
  editPlans,
  editLoadingCarriers,
  editLoadingPlans,
  onEditChangeCarrierChange,
}: {
  coverage: Coverage
  client: Client
  isExpanded: boolean
  isEditing: boolean
  editForm: ReturnType<typeof emptyCoverageForm>
  setEditForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyCoverageForm>>>
  onToggleExpand: () => void
  onEditStart: () => void
  onEditSave: () => void
  onEditCancel: () => void
  onDeleteClick: () => void
  getReplacingLabel: (id: string) => string
  activeCoverages: Coverage[]
  addresses: Client["addresses"]
  resolvedEditAddress: ReturnType<typeof getPreferredOrFirstAddress> | undefined
  editSelectedAddressId: string | null
  onEditAddressChange: (addressId: string | null) => void
  editCarriers: string[]
  editPlans: MedicarePlanOption[]
  editLoadingCarriers: boolean
  editLoadingPlans: boolean
  onEditChangeCarrierChange: (carrier: string | null) => void
}) {
  const effectiveDateDisplay = coverage.effectiveDate
    ? format(parseLocalDate(coverage.effectiveDate), "MMM d, yyyy")
    : null
  const statusStyle = getCoverageStatusStyle(coverage.status ?? "")
  const StatusIcon = statusStyle.Icon

  return (
    <Card className={`overflow-hidden ${statusStyle.cardAccentClass}`}>
      <div
        className="flex cursor-pointer items-start justify-between gap-2 p-3 transition-colors hover:bg-muted/50 active:bg-muted/50 sm:p-4"
        onClick={() => !isEditing && onToggleExpand()}
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">{coverage.carrier || "—"}</p>
          <p className="text-sm text-muted-foreground line-clamp-2 sm:line-clamp-1">{coverage.planName || "—"}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusStyle.pillClass}`}
            >
              <StatusIcon className="h-3.5 w-3.5 shrink-0" />
              {coverage.status || "—"}
            </span>
            {effectiveDateDisplay && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                <Appointment02 className="h-3.5 w-3.5 shrink-0" />
                {effectiveDateDisplay}
              </span>
            )}
            {(coverage.planType === "MAPD") && (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                  coverage.hraCollected
                    ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-muted text-muted-foreground border-border"
                }`}
                title="HRA collected"
              >
                HRA {coverage.hraCollected ? "Yes" : "No"}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 min-h-[44px] min-w-[44px] touch-manipulation sm:h-8 sm:w-8 sm:min-h-0 sm:min-w-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEditStart}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDeleteClick} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <Collapsible open={isExpanded} onOpenChange={(open) => !open && !isEditing && onToggleExpand()}>
        <CollapsibleContent>
          <div className="border-t px-3 pb-4 pt-3 sm:px-4">
            {coverage.notes?.trim() && !isEditing && (
              <Collapsible className="mb-3">
                <CollapsibleTrigger className="flex w-full items-center gap-2 text-left text-sm font-medium text-muted-foreground hover:text-foreground">
                  <ChevronDown className="h-4 w-4 shrink-0" />
                  Notes
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 pl-6 text-sm text-muted-foreground">
                  {coverage.notes}
                </CollapsibleContent>
              </Collapsible>
            )}
            {isEditing ? (
              <InlineCoverageForm
                form={editForm}
                setForm={setEditForm}
                activeCoverages={activeCoverages}
                getReplacingLabel={getReplacingLabel}
                onSave={onEditSave}
                onCancel={onEditCancel}
                addresses={addresses}
                resolvedEditAddress={resolvedEditAddress}
                editSelectedAddressId={editSelectedAddressId}
                onEditAddressChange={onEditAddressChange}
                editCarriers={editCarriers}
                editPlans={editPlans}
                editLoadingCarriers={editLoadingCarriers}
                editLoadingPlans={editLoadingPlans}
                onEditChangeCarrierChange={onEditChangeCarrierChange}
              />
            ) : (
              <div className="grid gap-2 text-sm">
                <Row label="Plan type" value={coverage.planType} />
                <Row label="Carrier" value={coverage.carrier} />
                <Row label="Plan name" value={coverage.planName} />
                <Row label="Status" value={coverage.status} />
                <Row label="Application date" value={coverage.applicationDate ? format(parseLocalDate(coverage.applicationDate), "MMM d, yyyy") : "—"} />
                <Row label="Effective date" value={effectiveDateDisplay ?? "—"} />
                {coverage.planType === "Med Supp" && coverage.premium != null && (
                  <Row label="Premium (monthly)" value={`$${Number(coverage.premium).toFixed(2)}`} />
                )}
                {coverage.planType === "Med Supp" && coverage.bonus != null && (
                  <Row label="Bonus" value={`$${Number(coverage.bonus).toFixed(2)}`} />
                )}
                {coverage.billingMethod && (
                  <Row label="Billing method" value={coverage.billingMethod} />
                )}
                {coverage.planType === "Med Supp" && coverage.draftDay && (
                  <Row label="Draft day" value={coverage.draftDay} />
                )}
                {coverage.planType !== "Med Supp" && (
                  <>
                    <Row label="Written as" value={coverage.writtenAs || "—"} />
                    <Row label="Election period" value={coverage.electionPeriod || "—"} />
                    <Row label="Application ID" value={coverage.applicationId || "—"} />
                  </>
                )}
                <Row label={coverage.planType === "Med Supp" ? "Policy #" : "Member / Policy #"} value={coverage.memberPolicyNumber || "—"} />
                <Row
                  label="Replacing"
                  value={coverage.replacingCoverageId ? getReplacingLabel(coverage.replacingCoverageId) : "—"}
                />
                {coverage.planType === "Med Supp" && coverage.enrollmentMethod && (
                  <Row label="Enrollment method" value={coverage.enrollmentMethod} />
                )}
                {coverage.planType === "Med Supp" && coverage.newToBookOrRewrite && (
                  <Row label="New to book or rewrite" value={coverage.newToBookOrRewrite} />
                )}
                {coverage.planType === "MAPD" && (
                  <Row label="HRA collected" value={coverage.hraCollected ? "Yes" : "No"} />
                )}
                {coverage.notes?.trim() && <Row label="Notes" value={coverage.notes} />}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:gap-4 sm:items-baseline">
      <span className="text-muted-foreground text-xs sm:text-sm shrink-0">{label}</span>
      <span className="text-right font-medium text-foreground text-sm break-words min-w-0">{value}</span>
    </div>
  )
}

function InlineCoverageForm({
  form,
  setForm,
  activeCoverages,
  getReplacingLabel,
  onSave,
  onCancel,
  addresses,
  resolvedEditAddress,
  editSelectedAddressId,
  onEditAddressChange,
  editCarriers,
  editPlans,
  editLoadingCarriers,
  editLoadingPlans,
  onEditChangeCarrierChange,
}: {
  form: ReturnType<typeof emptyCoverageForm>
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyCoverageForm>>>
  activeCoverages: Coverage[]
  getReplacingLabel: (id: string) => string
  onSave: () => void
  onCancel: () => void
  addresses: Client["addresses"]
  resolvedEditAddress: ReturnType<typeof getPreferredOrFirstAddress> | undefined
  editSelectedAddressId: string | null
  onEditAddressChange: (addressId: string | null) => void
  editCarriers: string[]
  editPlans: MedicarePlanOption[]
  editLoadingCarriers: boolean
  editLoadingPlans: boolean
  onEditChangeCarrierChange: (carrier: string | null) => void
}) {
  const [showChangePlans, setShowChangePlans] = useState(false)
  const [changeCarrier, setChangeCarrier] = useState("")
  const [changePlanId, setChangePlanId] = useState("")
  const [changePlanName, setChangePlanName] = useState("")
  const hasMultipleAddresses = addresses.length > 1
  const isEditMedSupp = form.planType === "Med Supp"
  const canShowPlanDropdowns = Boolean(resolvedEditAddress?.state?.trim() || isEditMedSupp)

  const handleOpenChange = useCallback(() => {
    setShowChangePlans(true)
    setChangeCarrier(form.carrier)
    setChangePlanId(form.planId ?? "")
    setChangePlanName(form.planName)
    onEditChangeCarrierChange(form.carrier)
    if (hasMultipleAddresses) {
      onEditAddressChange(null)
    }
  }, [form.carrier, form.planId, form.planName, hasMultipleAddresses, onEditAddressChange, onEditChangeCarrierChange])

  const handleChangeApply = useCallback(() => {
    setForm((f) => ({
      ...f,
      carrier: changeCarrier,
      planId: changePlanId,
      planName: changePlanName,
    }))
    setShowChangePlans(false)
    onEditChangeCarrierChange(null)
  }, [changeCarrier, changePlanId, changePlanName, setForm, onEditChangeCarrierChange])

  const handleChangeCancel = useCallback(() => {
    setShowChangePlans(false)
    onEditChangeCarrierChange(null)
  }, [onEditChangeCarrierChange])

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="min-w-0">
          <Label className="text-xs">Carrier</Label>
          <div className="flex h-10 min-h-[44px] w-full overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 sm:h-9 sm:min-h-0 [&>*]:flex-shrink-0 [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0">
            <Input
              value={form.carrier}
              onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))}
              className="h-full rounded-none border-0 bg-transparent px-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              type="button"
              variant="default"
              size="sm"
              className="!h-full min-h-0 shrink-0 rounded-none border-0 border-l border-primary px-3 text-xs font-medium touch-manipulation"
              onClick={handleOpenChange}
              disabled={addresses.length === 0 && !isEditMedSupp}
            >
              Change
            </Button>
          </div>
        </div>
        <div className="min-w-0">
          <Label className="text-xs">Plan name</Label>
          <div className="flex h-10 min-h-[44px] w-full overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 sm:h-9 sm:min-h-0 [&>*]:flex-shrink-0 [&>*:first-child]:flex-1 [&>*:first-child]:min-w-0">
            <Input
              value={form.planName}
              onChange={(e) => setForm((f) => ({ ...f, planName: e.target.value }))}
              className="h-full rounded-none border-0 bg-transparent px-3 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              type="button"
              variant="default"
              size="sm"
              className="!h-full min-h-0 shrink-0 rounded-none border-0 border-l border-primary px-3 text-xs font-medium touch-manipulation"
              onClick={handleOpenChange}
              disabled={addresses.length === 0 && !isEditMedSupp}
            >
              Change
            </Button>
          </div>
        </div>
      </div>
      {showChangePlans && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">
            {isEditMedSupp ? "Choose carrier and plan" : "Choose carrier and plan by location"}
          </p>
          {addresses.length === 0 && !isEditMedSupp ? (
            <p className="text-xs text-muted-foreground">Add an address to this client to view plans.</p>
          ) : (
            <>
              {hasMultipleAddresses && (
                <div>
                  <Label className="text-xs">View plans for</Label>
                  <Select
                    value={editSelectedAddressId ?? "_"}
                    onValueChange={(v) => {
                      onEditAddressChange(v === "_" ? null : v)
                      setChangeCarrier("")
                      setChangePlanId("")
                      setChangePlanName("")
                      onEditChangeCarrierChange(null)
                    }}
                  >
                    <SelectTrigger className="h-8 text-sm mt-1">
                      <SelectValue placeholder="Select address..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_">Select address...</SelectItem>
                      {addresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          {addr.isPreferred ? "Preferred: " : ""}
                          {addr.type} — {addr.city}, {addr.state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {canShowPlanDropdowns && (
                <>
                  <div>
                    <Label className="text-xs">Carrier</Label>
                    <Select
                      value={changeCarrier ? changeCarrier : "_"}
                      onValueChange={(v) => {
                        const carrier = v === "_" ? "" : v
                        setChangeCarrier(carrier)
                        setChangePlanId("")
                        setChangePlanName("")
                        onEditChangeCarrierChange(carrier)
                      }}
                      disabled={editLoadingCarriers}
                    >
                      <SelectTrigger className="h-8 text-sm mt-1">
                        <SelectValue placeholder={editLoadingCarriers ? "Loading..." : "Select..."} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">Select...</SelectItem>
                        {editCarriers.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Plan</Label>
                    <Select
                      value={changePlanId || "_"}
                      onValueChange={(v) => {
                        if (v === "_") {
                          setChangePlanId("")
                          setChangePlanName("")
                          return
                        }
                        const plan = editPlans.find((p) => p.id === v)
                        const displayName = plan?.contractId
                          ? `${plan.planName} (${plan.contractId})`
                          : (plan?.planName ?? "")
                        setChangePlanId(v)
                        setChangePlanName(displayName)
                      }}
                      disabled={!changeCarrier.trim() || editLoadingPlans}
                    >
                      <SelectTrigger className="h-8 text-sm mt-1">
                        <SelectValue
                          placeholder={
                            !changeCarrier.trim()
                              ? "Select carrier first"
                              : editLoadingPlans
                                ? "Loading..."
                                : "Select..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_">Select...</SelectItem>
                        {isEditMedSupp
                          ? MED_SUPP_PLANS_GROUPED.map((group) => (
                              <SelectGroup key={group.label ?? "standard"}>
                                {group.label && (
                                  <SelectLabel className="text-muted-foreground text-xs">
                                    --{group.label}--
                                  </SelectLabel>
                                )}
                                {group.plans.map((planName) => (
                                  <SelectItem key={planName} value={planName}>
                                    {planName}
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                            ))
                          : editPlans.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.contractId ? `${p.planName} (${p.contractId})` : p.planName}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
                <Button size="sm" onClick={handleChangeApply} disabled={!changeCarrier.trim() || !changePlanName.trim()} className="min-h-[44px] touch-manipulation sm:min-h-0">
                  Apply
                </Button>
                <Button size="sm" variant="outline" onClick={handleChangeCancel} className="min-h-[44px] touch-manipulation sm:min-h-0">
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      )}
      <div>
        <Label className="text-xs">Status</Label>
        <Select value={form.status || "_"} onValueChange={(v) => setForm((f) => ({ ...f, status: v === "_" ? "" : v }))}>
          <SelectTrigger className="h-10 min-h-[44px] text-sm sm:h-8 sm:min-h-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">Select...</SelectItem>
            <SelectGroup>
              {COVERAGE_STATUS_OPTIONS.filter(
                (o) => !o.separator && !["Kit Mailed", "Kit Emailed", "eSign Sent"].includes(o.value)
              ).map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel className="text-muted-foreground">— PRE SUBMISSION —</SelectLabel>
              <SelectItem value="Kit Mailed">Kit Mailed</SelectItem>
              <SelectItem value="Kit Emailed">Kit Emailed</SelectItem>
              <SelectItem value="eSign Sent">eSign Sent</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Application date</Label>
          <DatePicker
            value={form.applicationDate}
            onChange={(v) => setForm((f) => ({ ...f, applicationDate: v }))}
            placeholder="Pick a date"
            className="h-10 min-h-[44px] text-sm sm:h-8 sm:min-h-0"
          />
        </div>
        <div>
          <Label className="text-xs">Effective date</Label>
          <DatePicker
            value={form.effectiveDate}
            onChange={(v) => setForm((f) => ({ ...f, effectiveDate: v }))}
            placeholder="Pick a date"
            className="h-10 min-h-[44px] text-sm sm:h-8 sm:min-h-0"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Billing method</Label>
        <Select
          value={form.billingMethod || "_"}
          onValueChange={(v) => setForm((f) => ({ ...f, billingMethod: v === "_" ? "" : v }))}
        >
          <SelectTrigger className="h-10 min-h-[44px] text-sm sm:h-8 sm:min-h-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">Select...</SelectItem>
            {BILLING_METHOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isEditMedSupp && (
        <>
          <div>
            <Label className="text-xs">Premium * (monthly)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                value={form.premium}
                onChange={(e) => setForm((f) => ({ ...f, premium: e.target.value }))}
                placeholder="0.00"
                className="pl-7 h-10 min-h-[44px] text-sm sm:h-8 sm:min-h-0"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Bonus</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                value={form.bonus}
                onChange={(e) => setForm((f) => ({ ...f, bonus: e.target.value }))}
                placeholder="0.00"
                className="pl-7 h-10 min-h-[44px] text-sm sm:h-8 sm:min-h-0"
              />
            </div>
          </div>
          <div>
            <Label className="text-xs">Draft day</Label>
            <Select
              value={form.draftDay || "_"}
              onValueChange={(v) => setForm((f) => ({ ...f, draftDay: v === "_" ? "" : v }))}
            >
              <SelectTrigger className="h-10 min-h-[44px] text-sm sm:h-8 sm:min-h-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Select...</SelectItem>
                {DRAFT_DAY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Enrollment method</Label>
            <Select
              value={form.enrollmentMethod || "_"}
              onValueChange={(v) => setForm((f) => ({ ...f, enrollmentMethod: v === "_" ? "" : v }))}
            >
              <SelectTrigger className="h-10 min-h-[44px] text-sm sm:h-8 sm:min-h-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Select...</SelectItem>
                {ENROLLMENT_METHOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">New to book or rewrite</Label>
            <Select
              value={form.newToBookOrRewrite || "_"}
              onValueChange={(v) => setForm((f) => ({ ...f, newToBookOrRewrite: v === "_" ? "" : v }))}
            >
              <SelectTrigger className="h-10 min-h-[44px] text-sm sm:h-8 sm:min-h-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Select...</SelectItem>
                {NEW_TO_BOOK_OR_REWRITE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      {!isEditMedSupp && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Written as</Label>
            <Select
              value={form.writtenAs || "_"}
              onValueChange={(v) => setForm((f) => ({ ...f, writtenAs: v === "_" ? "" : v }))}
            >
              <SelectTrigger className="h-10 min-h-[44px] text-sm sm:h-8 sm:min-h-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Select...</SelectItem>
                {WRITTEN_AS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Election period</Label>
            <Select
              value={form.electionPeriod || "_"}
              onValueChange={(v) => setForm((f) => ({ ...f, electionPeriod: v === "_" ? "" : v }))}
            >
              <SelectTrigger className="h-10 min-h-[44px] text-sm sm:h-8 sm:min-h-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">Select...</SelectItem>
                {ELECTION_PERIOD_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      <div>
        <Label className="text-xs">{isEditMedSupp ? "Policy number" : "Member / Policy #"}</Label>
        <Input
          value={form.memberPolicyNumber}
          onChange={(e) => setForm((f) => ({ ...f, memberPolicyNumber: e.target.value }))}
          className="h-10 min-h-[44px] text-sm sm:h-8 sm:min-h-0"
        />
      </div>
      <div>
        <Label className="text-xs">Replacing</Label>
        <Select
          value={form.replacingCoverageId || "_"}
          onValueChange={(v) => setForm((f) => ({ ...f, replacingCoverageId: v === "_" ? "" : v }))}
          disabled={activeCoverages.length === 0}
        >
          <SelectTrigger className="h-10 min-h-[44px] text-sm sm:h-8 sm:min-h-0">
            <SelectValue placeholder={activeCoverages.length === 0 ? "No active plan" : "Select..."} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">Select...</SelectItem>
            {activeCoverages.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {getReplacingLabel(c.id)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {!isEditMedSupp && (
        <div>
          <Label className="text-xs">Application ID</Label>
          <Input
            value={form.applicationId}
            onChange={(e) => setForm((f) => ({ ...f, applicationId: e.target.value }))}
            className="h-10 min-h-[44px] text-sm sm:h-8 sm:min-h-0"
          />
        </div>
      )}
      {form.planType === "MAPD" && (
        <div className="flex items-center gap-2">
          <Checkbox
            id="edit-hra"
            checked={form.hraCollected}
            onCheckedChange={(checked) => setForm((f) => ({ ...f, hraCollected: !!checked }))}
          />
          <Label htmlFor="edit-hra" className="text-xs font-normal cursor-pointer">
            HRA collected
          </Label>
        </div>
      )}
      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          className="text-sm"
        />
      </div>
      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row">
        <Button size="sm" onClick={onSave} className="min-h-[44px] touch-manipulation sm:min-h-0">
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="min-h-[44px] touch-manipulation sm:min-h-0">
          Cancel
        </Button>
      </div>
    </div>
  )
}
