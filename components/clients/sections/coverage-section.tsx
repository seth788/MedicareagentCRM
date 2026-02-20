"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { parseLocalDate } from "@/lib/date-utils"
import { Shield, Plus, FileText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useCRMStore } from "@/lib/store"
import { goeyToast } from "goey-toast"
import type { PlanType } from "@/lib/types"
import type { SectionProps } from "./types"

export function CoverageSection({ client }: SectionProps) {
  const { updateClient, addActivity } = useCRMStore()
  const [editCoverageOpen, setEditCoverageOpen] = useState(false)
  const [coverageForm, setCoverageForm] = useState({
    planType: (client.coverage?.planType || "MA") as PlanType,
    carrier: client.coverage?.carrier || "",
    planName: client.coverage?.planName || "",
    effectiveDate: client.coverage?.effectiveDate?.split("T")[0] || "",
    applicationId: client.coverage?.applicationId || "",
    premium: client.coverage?.premium?.toString() || "0",
    lastReviewDate: client.coverage?.lastReviewDate?.split("T")[0] || "",
  })

  useEffect(() => {
    if (editCoverageOpen) {
      setCoverageForm({
        planType: (client.coverage?.planType || "MA") as PlanType,
        carrier: client.coverage?.carrier || "",
        planName: client.coverage?.planName || "",
        effectiveDate: client.coverage?.effectiveDate?.split("T")[0] || "",
        applicationId: client.coverage?.applicationId || "",
        premium: client.coverage?.premium?.toString() || "0",
        lastReviewDate: client.coverage?.lastReviewDate?.split("T")[0] || "",
      })
    }
  }, [editCoverageOpen, client.coverage])

  const logActivity = (description: string) => {
    addActivity({
      id: `act-${Date.now()}`,
      relatedType: "Client",
      relatedId: client.id,
      type: "note",
      description,
      createdAt: new Date().toISOString(),
      createdBy: "Sarah Mitchell",
    })
  }

  const handleSaveCoverage = () => {
    if (!coverageForm.carrier.trim() || !coverageForm.planName.trim()) return
    updateClient(client.id, {
      coverage: {
        planType: coverageForm.planType,
        carrier: coverageForm.carrier,
        planName: coverageForm.planName,
        effectiveDate: coverageForm.effectiveDate || new Date().toISOString(),
        applicationId: coverageForm.applicationId,
        premium: parseFloat(coverageForm.premium) || 0,
        lastReviewDate: coverageForm.lastReviewDate || new Date().toISOString(),
      },
    })
    logActivity(
      client.coverage
        ? `Coverage updated: ${coverageForm.carrier} ${coverageForm.planName}`
        : `Coverage added: ${coverageForm.carrier} ${coverageForm.planName}`
    )
    setEditCoverageOpen(false)
    goeyToast.success(client.coverage ? "Coverage updated" : "Coverage added")
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Shield className="h-5 w-5 text-primary" />
          {client.coverage ? "Current Coverage" : "No Coverage on File"}
        </CardTitle>
        <Dialog open={editCoverageOpen} onOpenChange={setEditCoverageOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              {client.coverage ? (
                "Edit"
              ) : (
                <>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add Coverage
                </>
              )}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{client.coverage ? "Edit" : "Add"} Coverage</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Plan Type</Label>
                  <Select
                    value={coverageForm.planType}
                    onValueChange={(v) =>
                      setCoverageForm({ ...coverageForm, planType: v as PlanType })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MA">Medicare Advantage (MA)</SelectItem>
                      <SelectItem value="MAPD">MA with Part D (MAPD)</SelectItem>
                      <SelectItem value="PDP">Part D (PDP)</SelectItem>
                      <SelectItem value="Supp">Medigap / Supplement</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cov-carrier">Carrier</Label>
                  <Input
                    id="cov-carrier"
                    placeholder="Aetna"
                    value={coverageForm.carrier}
                    onChange={(e) =>
                      setCoverageForm({ ...coverageForm, carrier: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="cov-plan">Plan Name</Label>
                <Input
                  id="cov-plan"
                  placeholder="Aetna Medicare Advantage Premier"
                  value={coverageForm.planName}
                  onChange={(e) =>
                    setCoverageForm({ ...coverageForm, planName: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cov-eff">Effective Date</Label>
                  <Input
                    id="cov-eff"
                    type="date"
                    value={coverageForm.effectiveDate}
                    onChange={(e) =>
                      setCoverageForm({ ...coverageForm, effectiveDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="cov-premium">Monthly Premium ($)</Label>
                  <Input
                    id="cov-premium"
                    type="number"
                    step="0.01"
                    min="0"
                    value={coverageForm.premium}
                    onChange={(e) =>
                      setCoverageForm({ ...coverageForm, premium: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cov-app">Application ID</Label>
                  <Input
                    id="cov-app"
                    placeholder="AET-2026-001234"
                    value={coverageForm.applicationId}
                    onChange={(e) =>
                      setCoverageForm({ ...coverageForm, applicationId: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="cov-review">Last Review Date</Label>
                  <Input
                    id="cov-review"
                    type="date"
                    value={coverageForm.lastReviewDate}
                    onChange={(e) =>
                      setCoverageForm({ ...coverageForm, lastReviewDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditCoverageOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveCoverage}
                disabled={!coverageForm.carrier.trim() || !coverageForm.planName.trim()}
              >
                Save Coverage
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-6 pt-0">
        {client.coverage ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Plan Type</p>
              <p className="mt-2 text-sm text-foreground">
                {client.coverage.planType === "MA" && "Medicare Advantage"}
                {client.coverage.planType === "MAPD" && "MA with Part D"}
                {client.coverage.planType === "PDP" && "Part D (PDP)"}
                {client.coverage.planType === "Supp" && "Medigap / Supplement"}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Carrier</p>
              <p className="mt-2 text-sm text-foreground">{client.coverage.carrier}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Plan Name</p>
              <p className="mt-2 text-sm text-foreground">{client.coverage.planName}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Effective Date</p>
              <p className="mt-2 text-sm text-foreground">
                {format(parseLocalDate(client.coverage.effectiveDate), "MMMM d, yyyy")}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Application ID</p>
              <code className="mt-2 block font-mono text-sm text-foreground">
                {client.coverage.applicationId}
              </code>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Monthly Premium</p>
              <p className="mt-2 text-sm text-foreground">
                {client.coverage.premium === 0
                  ? "$0.00"
                  : `$${client.coverage.premium.toFixed(2)}`}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Last Review</p>
              <p className="mt-2 text-sm text-foreground">
                {format(parseLocalDate(client.coverage.lastReviewDate), "MMMM d, yyyy")}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">
              No coverage information on file yet.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Click &quot;Add Coverage&quot; above to add plan details.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
