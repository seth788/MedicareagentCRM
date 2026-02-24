"use client"

import { useState, useCallback, useEffect } from "react"
import { format } from "date-fns"
import { parseLocalDate } from "@/lib/date-utils"
import { Shield, Plus, FileText, ChevronDown, MoreVertical, Pencil, Trash2 } from "@/components/icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
  DialogTrigger,
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
import { goeyToast } from "goey-toast"
import type { Client, Coverage } from "@/lib/types"
import type { CoveragePlanType } from "@/lib/types"
import {
  COVERAGE_STATUS_OPTIONS,
  WRITTEN_AS_OPTIONS,
  ELECTION_PERIOD_OPTIONS,
  COVERAGE_PLAN_TYPE_OPTIONS,
  isActiveCoverageStatus,
} from "@/lib/coverage-options"
import type { SectionProps } from "./types"
import { getPreferredOrFirstAddress } from "@/lib/utils"
import { normalizeCountyToPlainName } from "@/lib/utils"
import { fetchCarriersForLocation, fetchPlansForCarrier } from "@/app/actions/medicare-plans"
import type { MedicarePlanOption } from "@/lib/db/medicare-plans"

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
  }
}

function formToCoverage(
  form: ReturnType<typeof emptyCoverageForm>,
  id: string,
  existing?: Coverage
): Coverage {
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
    createdAt: existing?.createdAt,
    updatedAt: existing?.updatedAt,
  }
}

export function CoverageSection({ client }: SectionProps) {
  const { updateClient, addActivity, currentAgent } = useCRMStore()
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
  const canFetchPlans = Boolean(addStep === 2 && addPlanType && hasState)

  useEffect(() => {
    if (!canFetchPlans || !resolvedAddress?.state) {
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
        if (r.error) goeyToast.error(`Could not load carriers: ${r.error}`)
      })
      .catch(() => {
        setCarriers([])
        goeyToast.error("Failed to load carriers")
      })
      .finally(() => setLoadingCarriers(false))
  }, [canFetchPlans, addPlanType, resolvedAddress?.state, resolvedAddress?.county, normalizedCounty])

  useEffect(() => {
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
    canFetchPlans,
    addPlanType,
    resolvedAddress?.state,
    resolvedAddress?.county,
    normalizedCounty,
    addForm.carrier,
  ])

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState(emptyCoverageForm("MAPD"))
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const activeCoverages = coverages.filter((c) => isActiveCoverageStatus(c.status))

  const logActivity = useCallback(
    (description: string) => {
      addActivity({
        id: `act-${Date.now()}`,
        relatedType: "Client",
        relatedId: client.id,
        type: "note",
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

  const handleAddPlanTypeSelect = useCallback((value: CoveragePlanType) => {
    setAddPlanType(value)
    setAddForm(emptyCoverageForm(value))
    setPlans([])
    setAddStep(2)
  }, [])

  const handleAddAddressChange = useCallback((addressId: string | null) => {
    setSelectedAddressId(addressId)
    setAddForm((f) => ({ ...f, carrier: "", planName: "", planId: "" }))
    setPlans([])
  }, [])

  const handleAddSubmit = useCallback(() => {
    if (!addForm.carrier.trim() || !addForm.planName.trim() || !addForm.status || !addForm.effectiveDate) {
      goeyToast.error("Please fill required fields: Company/Carrier, Plan, Status, Effective date")
      return
    }
    const newCoverage = formToCoverage(addForm, crypto.randomUUID())
    const nextCoverages = [...coverages, newCoverage]
    updateClient(client.id, { coverages: nextCoverages })
    logActivity(`Coverage added: ${newCoverage.carrier} ${newCoverage.planName}`)
    goeyToast.success("Coverage added")
    setAddDialogOpen(false)
  }, [addForm, coverages, client.id, updateClient, logActivity])

  const handleEditStart = useCallback((c: Coverage) => {
    setExpandedId(c.id)
    setEditingId(c.id)
    setEditForm(coverageToForm(c))
  }, [])

  const handleEditSave = useCallback(() => {
    if (!editingId) return
    const cov = coverages.find((x) => x.id === editingId)
    if (!cov) return
    if (!editForm.carrier.trim() || !editForm.planName.trim() || !editForm.status || !editForm.effectiveDate) {
      goeyToast.error("Please fill required fields")
      return
    }
    const updated = formToCoverage(editForm, cov.id, cov)
    const nextCoverages = coverages.map((x) => (x.id === editingId ? updated : x))
    updateClient(client.id, { coverages: nextCoverages })
    logActivity(`Coverage updated: ${updated.carrier} ${updated.planName}`)
    goeyToast.success("Coverage updated")
    setEditingId(null)
  }, [editingId, editForm, coverages, client.id, updateClient, logActivity])

  const handleEditCancel = useCallback(() => {
    setEditingId(null)
  }, [])

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteConfirmId) return
    const toRemove = coverages.find((c) => c.id === deleteConfirmId)
    const nextCoverages = coverages.filter((c) => c.id !== deleteConfirmId)
    updateClient(client.id, { coverages: nextCoverages })
    if (toRemove) logActivity(`Coverage removed: ${toRemove.carrier} ${toRemove.planName}`)
    goeyToast.success("Coverage removed")
    setDeleteConfirmId(null)
    setExpandedId((id) => (id === deleteConfirmId ? null : id))
    setEditingId((id) => (id === deleteConfirmId ? null : id))
  }, [deleteConfirmId, coverages, client.id, updateClient, logActivity])

  const getReplacingLabel = (replacingId: string) => {
    const c = coverages.find((x) => x.id === replacingId)
    return c ? `${c.carrier} - ${c.planName}` : replacingId
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 py-4">
        <CardTitle className="flex items-center gap-2.5 text-base font-semibold">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/10">
            <Shield className="h-4 w-4 text-chart-3" />
          </div>
          {coverages.length > 0 ? "Coverage" : "No Coverage on File"}
        </CardTitle>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={handleAddOpen}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Coverage
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{addStep === 1 ? "Add Coverage" : "Add Coverage — Details"}</DialogTitle>
            </DialogHeader>
            {addStep === 1 ? (
              <div className="py-4">
                <p className="mb-4 text-sm text-muted-foreground">Select plan type</p>
                <div className="flex gap-3">
                  {COVERAGE_PLAN_TYPE_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      variant={addPlanType === opt.value ? "default" : "outline"}
                      onClick={() => handleAddPlanTypeSelect(opt.value)}
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
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={handleAddSubmit}
                  disabled={
                    !addForm.carrier.trim() ||
                    !addForm.planName.trim() ||
                    !addForm.status ||
                    !addForm.effectiveDate
                  }
                >
                  Save Coverage
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-6 pt-6">
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
  const canShowPlans = hasState
  const needsCounty = hasState && !normalizedCounty

  return (
    <div className="grid max-h-[60vh] gap-3 overflow-y-auto px-2 py-2">
      {!resolvedAddress && (
        <p className="text-sm text-muted-foreground">
          Add an address to this client to see plans by location.
        </p>
      )}
      {hasMultipleAddresses && resolvedAddress && (
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
                setForm((f) => ({
                  ...f,
                  planId: v,
                  planName: plan?.planName ?? "",
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
                {plans.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.planName} ({p.contractId})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </>
      )}
      <div>
        <Label>Status</Label>
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
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Application date</Label>
          <Input
            type="date"
            value={form.applicationDate}
            onChange={(e) => setForm((f) => ({ ...f, applicationDate: e.target.value }))}
          />
        </div>
        <div>
          <Label>Effective date *</Label>
          <Input
            type="date"
            value={form.effectiveDate}
            onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
          />
        </div>
      </div>
      <div>
        <Label>Written as</Label>
        <Select
          value={form.writtenAs || "_"}
          onValueChange={(v) => setForm((f) => ({ ...f, writtenAs: v === "_" ? "" : v }))}
        >
          <SelectTrigger>
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
        <Label>Member / Policy #</Label>
        <Input
          value={form.memberPolicyNumber}
          onChange={(e) => setForm((f) => ({ ...f, memberPolicyNumber: e.target.value }))}
          placeholder="Member or policy number"
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
      <div>
        <Label>Application ID</Label>
        <Input
          value={form.applicationId}
          onChange={(e) => setForm((f) => ({ ...f, applicationId: e.target.value }))}
          placeholder="Application ID"
        />
      </div>
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
}: {
  coverage: Coverage
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
}) {
  const effectiveDateDisplay = coverage.effectiveDate
    ? format(parseLocalDate(coverage.effectiveDate), "MMM d, yyyy")
    : "—"

  return (
    <Card className="overflow-hidden">
      <div
        className="flex cursor-pointer items-start justify-between gap-2 p-4 transition-colors hover:bg-muted/50"
        onClick={() => !isEditing && onToggleExpand()}
      >
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground">{coverage.carrier || "—"}</p>
          <p className="text-sm text-muted-foreground">{coverage.planName || "—"}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            <span className="text-muted-foreground">{coverage.status || "—"}</span>
            <span className="text-muted-foreground">{effectiveDateDisplay}</span>
          </div>
        </div>
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
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
          <div className="border-t px-4 pb-4 pt-3">
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
              />
            ) : (
              <div className="grid gap-2 text-sm">
                <Row label="Plan type" value={coverage.planType} />
                <Row label="Carrier" value={coverage.carrier} />
                <Row label="Plan name" value={coverage.planName} />
                <Row label="Status" value={coverage.status} />
                <Row label="Application date" value={coverage.applicationDate ? format(parseLocalDate(coverage.applicationDate), "MMM d, yyyy") : "—"} />
                <Row label="Effective date" value={effectiveDateDisplay} />
                <Row label="Written as" value={coverage.writtenAs || "—"} />
                <Row label="Election period" value={coverage.electionPeriod || "—"} />
                <Row label="Member / Policy #" value={coverage.memberPolicyNumber || "—"} />
                <Row
                  label="Replacing"
                  value={coverage.replacingCoverageId ? getReplacingLabel(coverage.replacingCoverageId) : "—"}
                />
                <Row label="Application ID" value={coverage.applicationId || "—"} />
                <Row label="HRA collected" value={coverage.hraCollected ? "Yes" : "No"} />
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
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
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
}: {
  form: ReturnType<typeof emptyCoverageForm>
  setForm: React.Dispatch<React.SetStateAction<ReturnType<typeof emptyCoverageForm>>>
  activeCoverages: Coverage[]
  getReplacingLabel: (id: string) => string
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Carrier</Label>
          <Input
            value={form.carrier}
            onChange={(e) => setForm((f) => ({ ...f, carrier: e.target.value }))}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Plan name</Label>
          <Input
            value={form.planName}
            onChange={(e) => setForm((f) => ({ ...f, planName: e.target.value }))}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div>
        <Label className="text-xs">Status</Label>
        <Select value={form.status || "_"} onValueChange={(v) => setForm((f) => ({ ...f, status: v === "_" ? "" : v }))}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_">Select...</SelectItem>
            {COVERAGE_STATUS_OPTIONS.filter((o) => !o.separator).map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Application date</Label>
          <Input
            type="date"
            value={form.applicationDate}
            onChange={(e) => setForm((f) => ({ ...f, applicationDate: e.target.value }))}
            className="h-8 text-sm"
          />
        </div>
        <div>
          <Label className="text-xs">Effective date</Label>
          <Input
            type="date"
            value={form.effectiveDate}
            onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
            className="h-8 text-sm"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Written as</Label>
          <Select
            value={form.writtenAs || "_"}
            onValueChange={(v) => setForm((f) => ({ ...f, writtenAs: v === "_" ? "" : v }))}
          >
            <SelectTrigger className="h-8 text-sm">
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
            <SelectTrigger className="h-8 text-sm">
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
      <div>
        <Label className="text-xs">Member / Policy #</Label>
        <Input
          value={form.memberPolicyNumber}
          onChange={(e) => setForm((f) => ({ ...f, memberPolicyNumber: e.target.value }))}
          className="h-8 text-sm"
        />
      </div>
      <div>
        <Label className="text-xs">Replacing</Label>
        <Select
          value={form.replacingCoverageId || "_"}
          onValueChange={(v) => setForm((f) => ({ ...f, replacingCoverageId: v === "_" ? "" : v }))}
          disabled={activeCoverages.length === 0}
        >
          <SelectTrigger className="h-8 text-sm">
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
      <div>
        <Label className="text-xs">Application ID</Label>
        <Input
          value={form.applicationId}
          onChange={(e) => setForm((f) => ({ ...f, applicationId: e.target.value }))}
          className="h-8 text-sm"
        />
      </div>
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
      <div>
        <Label className="text-xs">Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          className="text-sm"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button size="sm" onClick={onSave}>
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
