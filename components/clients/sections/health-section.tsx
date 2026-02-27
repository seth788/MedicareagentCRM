"use client"

import { useState, useEffect, useRef, useMemo } from "react"
import { Stethoscope, Pill, Building2, AlertTriangle, Plus, Trash2, Pencil, MoreVertical, Search, ArrowLeft, MapPin, Hospital, Phone, Doctor as DoctorIcon, ChevronRight, ChevronLeft, StickyNote, Heart, CheckmarkBadge, Aids, Drink, Lungs, Brain01, Kidneys, Bacteria, Blood, Cardiogram02, Heartbreak, Brain02, GiveBlood, Liver, AiBrain01 } from "@/components/icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { useCRMStore } from "@/lib/store"
import { cn, getPreferredOrFirstAddress } from "@/lib/utils"
import { toast } from "sonner"
import type { Doctor, DoctorImportance, Medication, Pharmacy } from "@/lib/types"
import type { SectionProps } from "./types"
import {
  SPECIALTY_OPTIONS,
  DEFAULT_SPECIALTY,
  getTaxonomyDescriptionByLabel,
  getLabelBySpecialty,
  getOrganizationDisplayName,
  type NPIResultDTO,
} from "@/lib/npi"

const IMPORTANCE_OPTIONS: { value: DoctorImportance; label: string }[] = [
  { value: "essential", label: "Essential" },
  { value: "preferred", label: "Preferred" },
  { value: "flexible", label: "Flexible" },
]

const DEFAULT_IMPORTANCE: DoctorImportance = "preferred"

const FREQUENCY_FILL_OPTIONS = [
  "Monthly",
  "Every 2 months",
  "Every 3 months",
  "Every 6 months",
  "Every 12 months",
] as const

const DEFAULT_FREQUENCY_FILL = "Monthly"

/** Health tracker: category labels (types) with their sub-items. Categories are bold headers with icon; items are checkboxes. */
const HEALTH_TRACKER_GROUPS: {
  label: string
  items: string[]
  icon: React.ComponentType<{ className?: string }>
}[] = [
  { label: "SSBCI", items: ["SSBCI Verified"], icon: CheckmarkBadge },
  { label: "Cancer", items: ["Cancer", "Cancer Remission", "Cancer Survivor"], icon: Aids },
  { label: "Alcohol or substance disorder", items: ["Alcohol or substance disorder"], icon: Drink },
  {
    label: "Chronic lung disorders",
    items: ["Asthma", "Chronic bronchitis", "Emphysema", "Pulmonary fibrosis", "Pulmonary hypertension"],
    icon: Lungs,
  },
  { label: "Dementia", items: ["Dementia"], icon: Brain01 },
  { label: "HIV/AIDS", items: ["HIV/AIDS"], icon: Aids },
  {
    label: "Renal disease",
    items: ["ESRD", "Kidney disease", "Kidney disease stage 3+"],
    icon: Kidneys,
  },
  {
    label: "Severe hematologic disorders",
    items: [
      "Aplastic anemia",
      "Hemophilia",
      "Immune thrombocytopenic purpura",
      "Myelodysplastic syndrome",
      "Sickle-cell disease",
      "Venous thrombocytopenic disorder",
    ],
    icon: Bacteria,
  },
  {
    label: "Autoimmune disorders",
    items: [
      "Polyarteritis nodosa",
      "Polymyalgia rheumatica",
      "Polymyositis",
      "Rheumatoid arthritis",
      "Systemic lupus",
    ],
    icon: Blood,
  },
  {
    label: "Cardiovascular disorders",
    items: [
      "Cardiac arrhythmias",
      "Coronary artery disease",
      "Peripheral vascular disease",
      "Venous thromboembolic",
    ],
    icon: Cardiogram02,
  },
  {
    label: "Chronic Heart Failure",
    items: ["Chronic Heart Failure", "Chronic heart failure", "Congestive heart failure"],
    icon: Heartbreak,
  },
  {
    label: "Mental health conditions",
    items: [
      "Anxiety",
      "Bipolar",
      "Major depressive",
      "Memory Issues",
      "Paranoid disorder",
      "Schizoaffective disorder",
      "Schizophrenia",
    ],
    icon: Brain02,
  },
  { label: "Diabetes mellitus", items: ["Diabetes mellitus"], icon: GiveBlood },
  { label: "End-stage liver disease", items: ["End-stage liver disease"], icon: Liver },
  {
    label: "Neurologic disorders",
    items: [
      "ALS",
      "Epilepsy",
      "Extensive paralysis",
      "Huntington's disease",
      "Multiple sclerosis",
      "Parkinson's disease",
      "Polyneuropathy",
      "Spinal stenosis",
      "Stroke-related neurologic deficit",
    ],
    icon: AiBrain01,
  },
  { label: "Stroke", items: ["Stroke"], icon: Brain01 },
]

interface DrugProductDTO {
  drugName: string
  brandName?: string
  dosageLabel: string
  dosageDisplay: string
  doseForm: string
  rxcui: string
  isDefault?: boolean
}

interface DrugPackageDTO {
  packageDescription: string
  packageNdc: string
}

const PACKAGE_REQUIRED_FORMS = [
  "injectable solution",
  "injectable suspension",
  "pen injector",
  "cartridge",
  "prefilled syringe",
  "auto-injector",
  "metered dose inhaler",
  "inhaler",
  "ophthalmic solution",
  "topical cream",
  "ointment",
  "gel",
  "topical gel",
  "patch",
  "transdermal",
]

function isPackageRequiredForm(doseForm: string): boolean {
  const lower = (doseForm ?? "").toLowerCase().trim()
  return PACKAGE_REQUIRED_FORMS.some((form) => lower.includes(form))
}

function productMatchesSelectedName(p: DrugProductDTO, name: string): boolean {
  if (p.drugName === name) return true
  if (p.brandName && p.brandName === name) return true
  return false
}

function importancePillClass(importance: DoctorImportance | undefined): string {
  switch (importance ?? DEFAULT_IMPORTANCE) {
    case "essential":
      return "bg-destructive/15 text-destructive border-destructive/30"
    case "preferred":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
    case "flexible":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
    default:
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30"
  }
}

function importanceLabel(importance: DoctorImportance | undefined): string {
  const opt = IMPORTANCE_OPTIONS.find((o) => o.value === (importance ?? DEFAULT_IMPORTANCE))
  return opt?.label ?? "Preferred"
}

/** Convert ALL CAPS or lowercase to title case for display and storage */
function toTitleCase(s: string | undefined): string {
  if (s == null || !s.trim()) return s ?? ""
  return s
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/** Title-case pharmacy address but keep 2-letter state uppercase (e.g. OH not Oh). Normalize zip to 5 digits only. */
function formatPharmacyAddress(address: string | undefined): string {
  if (!address?.trim()) return ""
  const titleCased = toTitleCase(address)
  // Uppercase 2-letter state and keep only 5-digit zip (NPI sometimes returns zip+digits concatenated like 453711337)
  return titleCased.replace(
    /\b([A-Za-z]{2})[\s,]*(\d{5})(?:-\d{4}|\d{4})?\b/g,
    (_, state, zip5) => `${state.toUpperCase()} ${zip5}`
  )
}

export function HealthSection({ client }: SectionProps) {
  const { updateClient, addActivity, currentAgent } = useCRMStore()

  const defaultDoctorForm = (): Doctor => ({
    name: "",
    specialty: DEFAULT_SPECIALTY,
    phone: "",
    firstName: "",
    lastName: "",
    providerId: "",
    facilityAddress: "",
    note: "",
    importance: DEFAULT_IMPORTANCE,
  })

  const [addDoctorOpen, setAddDoctorOpen] = useState(false)
  const [editDoctorIndex, setEditDoctorIndex] = useState<number | null>(null)
  const [doctorForm, setDoctorForm] = useState<Doctor>(defaultDoctorForm())
  const [addDoctorMode, setAddDoctorMode] = useState<"search" | "results" | "manual">("search")
  const [doctorSearchCity, setDoctorSearchCity] = useState("")
  const [doctorSearchState, setDoctorSearchState] = useState("")
  const [doctorSearchSpecialty, setDoctorSearchSpecialty] = useState(DEFAULT_SPECIALTY)
  const [doctorSearchLastName, setDoctorSearchLastName] = useState("")
  const [doctorSearchFacilityName, setDoctorSearchFacilityName] = useState("")
  const NPI_RESULTS_PER_PAGE = 10
  const [npiSearchResults, setNpiSearchResults] = useState<NPIResultDTO[] | null>(null)
  const [npiSearchPage, setNpiSearchPage] = useState(0)
  const [npiSearchLoading, setNpiSearchLoading] = useState(false)
  const [npiSearchError, setNpiSearchError] = useState<string | null>(null)

  const defaultMedForm = (): Medication => ({
    name: "",
    dosage: "",
    frequency: DEFAULT_FREQUENCY_FILL,
    quantity: 30,
    notes: "",
    firstPrescribed: "",
    package: "",
    drugName: "",
    dosageDisplay: "",
    doseForm: "",
    isPackageDrug: false,
    packageDescription: "",
    packageNdc: "",
    brandName: "",
  })

  const [addMedOpen, setAddMedOpen] = useState(false)
  const [editMedIndex, setEditMedIndex] = useState<number | null>(null)
  const [medForm, setMedForm] = useState<Medication>(defaultMedForm())
  const [drugSearchQuery, setDrugSearchQuery] = useState("")
  const [drugSearchLoading, setDrugSearchLoading] = useState(false)
  const [drugSearchProducts, setDrugSearchProducts] = useState<DrugProductDTO[]>([])
  const drugSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dosageProductsForSelectedDrug, setDosageProductsForSelectedDrug] = useState<DrugProductDTO[]>([])
  const [dosageProductsForDrugName, setDosageProductsForDrugName] = useState<string | null>(null)
  const [dosageProductsLoading, setDosageProductsLoading] = useState(false)
  const [packageOptions, setPackageOptions] = useState<DrugPackageDTO[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [selectedPackageNdc, setSelectedPackageNdc] = useState<string | null>(null)

  const [pharmDialogOpen, setPharmDialogOpen] = useState(false)
  const [editPharmIndex, setEditPharmIndex] = useState<number | null>(null)
  const [pharmForm, setPharmForm] = useState<Pharmacy>({ name: "", phone: "", address: "" })
  const [addPharmMode, setAddPharmMode] = useState<"search" | "results" | "manual">("search")
  const [pharmSearchZip, setPharmSearchZip] = useState("")
  const [pharmSearchRadius, setPharmSearchRadius] = useState("2")
  const [pharmSearchName, setPharmSearchName] = useState("")
  const [pharmNpiResults, setPharmNpiResults] = useState<NPIResultDTO[] | null>(null)
  const [pharmNpiPage, setPharmNpiPage] = useState(0)
  const [pharmNpiLoading, setPharmNpiLoading] = useState(false)
  const [pharmNpiError, setPharmNpiError] = useState<string | null>(null)
  const PHARM_RESULTS_PER_PAGE = 10
  const PHARM_RADIUS_OPTIONS = [
    { value: "2", label: "2 miles" },
    { value: "5", label: "5 miles" },
    { value: "10", label: "10 miles" },
    { value: "20", label: "20 miles" },
    { value: "50", label: "50 miles" },
  ]

  const [addAllergyOpen, setAddAllergyOpen] = useState(false)
  const [newAllergy, setNewAllergy] = useState("")
  const [editAllergyOpen, setEditAllergyOpen] = useState(false)
  const [editingAllergy, setEditingAllergy] = useState({ value: "", original: "" })

  const openPharmForm = (pharmacy?: Pharmacy, index?: number) => {
    setPharmForm(pharmacy ?? { name: "", phone: "", address: "" })
    setEditPharmIndex(index ?? null)
    setPharmDialogOpen(true)
    if (index === undefined && !pharmacy) {
      setAddPharmMode("search")
      setPharmSearchZip(getPreferredOrFirstAddress(client)?.zip?.trim() ?? "")
      setPharmSearchRadius("2")
      setPharmSearchName("")
      setPharmNpiResults(null)
      setPharmNpiPage(0)
      setPharmNpiError(null)
    }
  }

  const openDoctorForm = (doctor?: Doctor, index?: number) => {
    setDoctorForm(
      doctor
        ? {
            ...defaultDoctorForm(),
            ...doctor,
            specialty: getLabelBySpecialty(doctor.specialty),
            firstName: doctor.firstName ?? "",
            lastName: doctor.lastName ?? "",
            providerId: doctor.providerId ?? "",
            facilityAddress: doctor.facilityAddress ?? "",
            note: doctor.note ?? "",
            importance: doctor.importance ?? DEFAULT_IMPORTANCE,
          }
        : defaultDoctorForm()
    )
    setEditDoctorIndex(index ?? null)
    setAddDoctorOpen(true)
    if (index === undefined && !doctor) {
      setAddDoctorMode("search")
      setNpiSearchResults(null)
      setNpiSearchPage(0)
      setNpiSearchError(null)
      const addr = getPreferredOrFirstAddress(client)
      setDoctorSearchCity(addr?.city?.trim() ?? "")
      setDoctorSearchState(addr?.state?.trim().slice(0, 2) ?? "")
      setDoctorSearchSpecialty(DEFAULT_SPECIALTY)
      setDoctorSearchLastName("")
      setDoctorSearchFacilityName("")
    }
  }

  const openMedForm = (med?: Medication, index?: number) => {
    if (med != null && index != null) {
      setMedForm({
        name: med.name ?? med.drugName ?? "",
        dosage: med.dosage ?? med.dosageDisplay ?? "",
        frequency: med.frequency || DEFAULT_FREQUENCY_FILL,
        quantity: med.quantity ?? 30,
        notes: med.notes ?? "",
        firstPrescribed: med.firstPrescribed ?? "",
        package: med.package ?? "",
        rxcui: med.rxcui,
        ndcs: med.ndcs,
        drugName: med.drugName ?? med.name ?? "",
        dosageDisplay: med.dosageDisplay ?? med.dosage ?? "",
        doseForm: med.doseForm ?? "",
        isPackageDrug: med.isPackageDrug ?? false,
        packageDescription: med.packageDescription ?? "",
        packageNdc: med.packageNdc ?? "",
        brandName: med.brandName ?? "",
      })
    } else {
      setMedForm(defaultMedForm())
      setDrugSearchQuery("")
      setDrugSearchProducts([])
      setDosageProductsForSelectedDrug([])
      setDosageProductsForDrugName(null)
      setPackageOptions([])
      setSelectedPackageNdc(null)
    }
    setEditMedIndex(index ?? null)
    setAddMedOpen(true)
  }

  const logActivity = (description: string) => {
    addActivity({
      id: `act-${Date.now()}`,
      relatedType: "Client",
      relatedId: client.id,
      type: "note",
      description,
      createdAt: new Date().toISOString(),
      createdBy: currentAgent,
    })
  }

  const handleSaveDoctor = () => {
    const name =
      doctorForm.name.trim() ||
      [doctorForm.firstName, doctorForm.lastName].filter(Boolean).join(" ").trim()
    if (!name) return
    const toSave: Doctor = {
      name,
      specialty: doctorForm.specialty?.trim() ?? "",
      phone: doctorForm.phone?.trim() ?? "",
      firstName: doctorForm.firstName?.trim() || undefined,
      lastName: doctorForm.lastName?.trim() || undefined,
      providerId: doctorForm.providerId?.trim() || undefined,
      facilityAddress: doctorForm.facilityAddress?.trim() || undefined,
      note: doctorForm.note?.trim() || undefined,
      importance: doctorForm.importance ?? DEFAULT_IMPORTANCE,
    }
    if (editDoctorIndex !== null) {
      const updated = [...client.doctors]
      updated[editDoctorIndex] = toSave
      updateClient(client.id, { doctors: updated })
      logActivity(`Doctor updated: ${name}`)
      toast.success("Doctor updated")
    } else {
      updateClient(client.id, { doctors: [...client.doctors, toSave] })
      logActivity(`Doctor added: ${name}`)
      toast.success("Doctor added")
    }
    setDoctorForm(defaultDoctorForm())
    setEditDoctorIndex(null)
    setAddDoctorOpen(false)
  }

  const handleRemoveDoctor = (index: number) => {
    const removed = client.doctors[index]
    const updated = client.doctors.filter((_, i) => i !== index)
    updateClient(client.id, { doctors: updated })
    logActivity(`Doctor removed: ${removed?.name ?? "Unknown"}`)
    toast.success("Doctor removed")
  }

  const handleNpiSearch = async () => {
    const city = doctorSearchCity.trim()
    const state = doctorSearchState.trim()
    if (!city || !state) {
      toast.error("City and State are required")
      return
    }
    setNpiSearchLoading(true)
    setNpiSearchError(null)
    try {
      const taxonomy = getTaxonomyDescriptionByLabel(doctorSearchSpecialty)
      const params = new URLSearchParams({
        city,
        state: state.slice(0, 2),
        taxonomy_description: taxonomy,
      })
      if (doctorSearchLastName.trim()) params.set("last_name", doctorSearchLastName.trim())
      if (doctorSearchFacilityName.trim()) params.set("facility_name", doctorSearchFacilityName.trim())
      const res = await fetch(`/api/npi-search?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        setNpiSearchError(data.error ?? "Search failed")
        setNpiSearchResults([])
        return
      }
      setNpiSearchResults(data.results ?? [])
      setNpiSearchPage(0)
      setAddDoctorMode("results")
    } catch {
      setNpiSearchError("Failed to search providers")
      setNpiSearchResults([])
    } finally {
      setNpiSearchLoading(false)
    }
  }

  const handleSelectNpiDoctor = (dto: NPIResultDTO) => {
    const rawName =
      dto.entityType === "organization"
        ? (dto.organizationName ?? "Unknown")
        : [dto.firstName, dto.lastName].filter(Boolean).join(" ") || "Unknown"
    const newDoctor: Doctor = {
      name: toTitleCase(rawName),
      specialty: getLabelBySpecialty(dto.specialty),
      phone: dto.phone || "",
      firstName: dto.firstName ? toTitleCase(dto.firstName) : undefined,
      lastName: dto.lastName ? toTitleCase(dto.lastName) : undefined,
      providerId: dto.npi || undefined,
      facilityAddress: dto.facilityAddress ? formatPharmacyAddress(dto.facilityAddress) : undefined,
      importance: "preferred",
    }
    updateClient(client.id, { doctors: [...client.doctors, newDoctor] })
    logActivity(`Doctor added: ${newDoctor.name}`)
    toast.success("Doctor added")
    setAddDoctorOpen(false)
    setAddDoctorMode("search")
    setNpiSearchResults(null)
  }

  const doctorDisplayName = (doc: Doctor) =>
    doc.firstName && doc.lastName ? `${doc.firstName} ${doc.lastName}` : doc.name

  /** Typeahead suggestions from RxNorm approximateTerm (Step 1). Only full drug-search runs on selection (Step 2). */
  const [typeaheadSuggestions, setTypeaheadSuggestions] = useState<string[]>([])

  useEffect(() => {
    const trimmed = drugSearchQuery.trim()
    if (trimmed.length < 2) {
      setTypeaheadSuggestions([])
      return
    }
    if (drugSearchDebounceRef.current) clearTimeout(drugSearchDebounceRef.current)
    drugSearchDebounceRef.current = setTimeout(async () => {
      setDrugSearchLoading(true)
      try {
        const params = new URLSearchParams({
          term: trimmed,
          maxEntries: "10",
        })
        const res = await fetch(`/api/drug-search/approximate?${params.toString()}`)
        const data = await res.json()
        if (res.ok) setTypeaheadSuggestions(data.suggestions ?? [])
        else setTypeaheadSuggestions([])
      } catch {
        setTypeaheadSuggestions([])
      } finally {
        setDrugSearchLoading(false)
      }
    }, 300)
    return () => {
      if (drugSearchDebounceRef.current) clearTimeout(drugSearchDebounceRef.current)
    }
  }, [drugSearchQuery])

  const drugNamesForAutocomplete = useMemo(() => {
    const seen = new Set<string>()
    const names: string[] = []
    for (const p of drugSearchProducts) {
      for (const name of [p.drugName, p.brandName].filter(Boolean) as string[]) {
        if (seen.has(name)) continue
        seen.add(name)
        names.push(name)
      }
    }
    return names
  }, [drugSearchProducts])

  const dosageOptionsForSelectedDrug = useMemo(() => {
    if (!medForm.name.trim()) return []
    const source =
      dosageProductsForDrugName === medForm.name && dosageProductsForSelectedDrug.length > 0
        ? dosageProductsForSelectedDrug
        : drugSearchProducts.filter((p) => productMatchesSelectedName(p, medForm.name))
    const seen = new Set<string>()
    return source
      .map((p) => p.dosageDisplay)
      .filter((label) => {
        if (seen.has(label)) return false
        seen.add(label)
        return true
      })
  }, [
    drugSearchProducts,
    medForm.name,
    dosageProductsForSelectedDrug,
    dosageProductsForDrugName,
  ])

  const dosageProductsForDropdown = useMemo(() => {
    if (!medForm.name.trim()) return []
    const source =
      dosageProductsForDrugName === medForm.name && dosageProductsForSelectedDrug.length > 0
        ? dosageProductsForSelectedDrug
        : drugSearchProducts.filter((p) => productMatchesSelectedName(p, medForm.name))
    const byDisplay = new Map<string, DrugProductDTO>()
    for (const p of source) {
      if (!byDisplay.has(p.dosageDisplay)) byDisplay.set(p.dosageDisplay, p)
    }
    return Array.from(byDisplay.values())
  }, [
    drugSearchProducts,
    medForm.name,
    dosageProductsForSelectedDrug,
    dosageProductsForDrugName,
  ])

  const sourceProductsForSelectedDosage = useMemo(() => {
    if (!medForm.dosage.trim() || !medForm.name.trim()) return []
    const source =
      dosageProductsForDrugName === medForm.name && dosageProductsForSelectedDrug.length > 0
        ? dosageProductsForSelectedDrug
        : drugSearchProducts.filter((p) => productMatchesSelectedName(p, medForm.name))
    return source.filter((p) => p.dosageDisplay === medForm.dosage)
  }, [
    medForm.name,
    medForm.dosage,
    dosageProductsForSelectedDrug,
    dosageProductsForDrugName,
    drugSearchProducts,
  ])

  const selectedDosageRxcui = useMemo(
    () => sourceProductsForSelectedDosage[0]?.rxcui ?? null,
    [sourceProductsForSelectedDosage]
  )

  const selectedIsPackageDrug = useMemo(() => {
    const p = sourceProductsForSelectedDosage[0]
    return p ? isPackageRequiredForm(p.doseForm) : false
  }, [sourceProductsForSelectedDosage])

  const showPackageForSelectedDosage =
    selectedIsPackageDrug && packageOptions.length >= 1
  const showPackageDropdown = selectedIsPackageDrug && packageOptions.length > 1
  const finalRxcui = selectedDosageRxcui

  useEffect(() => {
    if (!selectedDosageRxcui || !selectedIsPackageDrug || editMedIndex !== null) {
      setPackageOptions([])
      setSelectedPackageNdc(null)
      return
    }
    setPackagesLoading(true)
    setSelectedPackageNdc(null)
    fetch(`/api/drug-packages?rxcui=${encodeURIComponent(selectedDosageRxcui)}`)
      .then((res) => res.json())
      .then((data: { packages?: DrugPackageDTO[] }) => {
        const packages = data.packages ?? []
        setPackageOptions(packages)
        if (packages.length === 1) {
          setSelectedPackageNdc(packages[0].packageNdc)
          setMedForm((prev) => ({
            ...prev,
            packageDescription: packages[0].packageDescription,
            packageNdc: packages[0].packageNdc,
          }))
        } else {
          setMedForm((prev) => ({
            ...prev,
            packageDescription: "",
            packageNdc: "",
          }))
        }
      })
      .catch(() => {
        setPackageOptions([])
        setSelectedPackageNdc(null)
      })
      .finally(() => setPackagesLoading(false))
  }, [selectedDosageRxcui, selectedIsPackageDrug, editMedIndex])

  const medNameForSave = medForm.name.trim() || (editMedIndex === null ? drugSearchQuery.trim() : "")
  const dosageDisplayForSave = medForm.dosageDisplay?.trim() || medForm.dosage?.trim() || ""
  const drugNameForSave = medForm.drugName?.trim() || medNameForSave

  const buildMedicationToSave = (overrides?: { rxcui?: string; ndcs?: string[] }): Medication => ({
    name: drugNameForSave,
    dosage: dosageDisplayForSave,
    frequency: medForm.frequency || DEFAULT_FREQUENCY_FILL,
    quantity: medForm.quantity,
    notes: medForm.notes?.trim() || undefined,
    firstPrescribed: medForm.firstPrescribed?.trim() || undefined,
    package: medForm.package?.trim() || undefined,
    rxcui: overrides?.rxcui ?? medForm.rxcui,
    ndcs: overrides?.ndcs ?? medForm.ndcs,
    drugName: drugNameForSave,
    dosageDisplay: dosageDisplayForSave,
    doseForm: medForm.doseForm?.trim() || undefined,
    isPackageDrug: medForm.isPackageDrug ?? false,
    packageDescription: medForm.isPackageDrug
      ? (medForm.packageDescription?.trim() || undefined)
      : undefined,
    packageNdc: medForm.isPackageDrug ? (medForm.packageNdc?.trim() || undefined) : undefined,
    brandName: medForm.brandName?.trim() || undefined,
  })

  const handleSaveMed = async () => {
    if (!medNameForSave) return
    let toSave: Medication
    if (editMedIndex !== null) {
      toSave = buildMedicationToSave()
    } else {
      if (finalRxcui) {
        try {
          const res = await fetch(`/api/drug-ndcs?rxcui=${encodeURIComponent(finalRxcui)}`)
          const data = await res.json()
          const ndcs = Array.isArray(data.ndcs) ? data.ndcs : []
          toSave = buildMedicationToSave({ rxcui: finalRxcui, ndcs })
        } catch {
          toSave = buildMedicationToSave({ rxcui: finalRxcui, ndcs: [] })
        }
      } else {
        toSave = buildMedicationToSave()
      }
    }
    if (editMedIndex !== null) {
      const updated = [...client.medications]
      updated[editMedIndex] = toSave
      updateClient(client.id, { medications: updated })
      logActivity(`Medication updated: ${toSave.name}`)
      toast.success("Medication updated")
    } else {
      updateClient(client.id, { medications: [...client.medications, toSave] })
      logActivity(`Medication added: ${toSave.name}`)
      toast.success("Medication added")
    }
    setMedForm(defaultMedForm())
    setEditMedIndex(null)
    setAddMedOpen(false)
  }

  const handleSaveMedAndAddMore = async () => {
    if (!medNameForSave) return
    let toSave: Medication
    if (finalRxcui) {
      try {
        const res = await fetch(`/api/drug-ndcs?rxcui=${encodeURIComponent(finalRxcui)}`)
        const data = await res.json()
        const ndcs = Array.isArray(data.ndcs) ? data.ndcs : []
        toSave = buildMedicationToSave({ rxcui: finalRxcui, ndcs })
      } catch {
        toSave = buildMedicationToSave({ rxcui: finalRxcui, ndcs: [] })
      }
    } else {
      toSave = buildMedicationToSave()
    }
    updateClient(client.id, { medications: [...client.medications, toSave] })
    logActivity(`Medication added: ${toSave.name}`)
    toast.success("Medication added")
    setMedForm(defaultMedForm())
    setDrugSearchQuery("")
    setDrugSearchProducts([])
    setDosageProductsForSelectedDrug([])
    setDosageProductsForDrugName(null)
    setPackageOptions([])
    setSelectedPackageNdc(null)
  }

  const handleSaveMedAndDone = async () => {
    if (!medNameForSave) return
    let toSave: Medication
    if (finalRxcui) {
      try {
        const res = await fetch(`/api/drug-ndcs?rxcui=${encodeURIComponent(finalRxcui)}`)
        const data = await res.json()
        const ndcs = Array.isArray(data.ndcs) ? data.ndcs : []
        toSave = buildMedicationToSave({ rxcui: finalRxcui, ndcs })
      } catch {
        toSave = buildMedicationToSave({ rxcui: finalRxcui, ndcs: [] })
      }
    } else {
      toSave = buildMedicationToSave()
    }
    updateClient(client.id, { medications: [...client.medications, toSave] })
    logActivity(`Medication added: ${toSave.name}`)
    toast.success("Medication added")
    setMedForm(defaultMedForm())
    setEditMedIndex(null)
    setAddMedOpen(false)
    setDrugSearchQuery("")
    setDrugSearchProducts([])
    setDosageProductsForSelectedDrug([])
    setDosageProductsForDrugName(null)
    setPackageOptions([])
    setSelectedPackageNdc(null)
  }

  const handleRemoveMed = (index: number) => {
    const removed = client.medications[index]
    const updated = client.medications.filter((_, i) => i !== index)
    updateClient(client.id, { medications: updated })
    logActivity(`Medication removed: ${removed?.name ?? "Unknown"}`)
    toast.success("Medication removed")
  }

  const handleSavePharmacy = () => {
    if (!pharmForm.name.trim()) return
    const pharmacies = client.pharmacies ?? []
    if (editPharmIndex !== null) {
      const updated = [...pharmacies]
      updated[editPharmIndex] = { ...pharmForm }
      updateClient(client.id, { pharmacies: updated })
      logActivity(`Pharmacy updated: ${pharmForm.name}`)
      toast.success("Pharmacy updated")
    } else {
      updateClient(client.id, { pharmacies: [...pharmacies, { ...pharmForm }] })
      logActivity(`Pharmacy added: ${pharmForm.name}`)
      toast.success("Pharmacy added")
    }
    setPharmForm({ name: "", phone: "", address: "" })
    setEditPharmIndex(null)
    setPharmDialogOpen(false)
  }

  const handleRemovePharmacy = (index: number) => {
    const pharmacies = (client.pharmacies ?? []).filter((_, i) => i !== index)
    const removed = client.pharmacies?.[index]
    updateClient(client.id, { pharmacies })
    logActivity(`Pharmacy removed: ${removed?.name ?? "Unknown"}`)
    toast.success("Pharmacy removed")
  }

  const handlePharmacySearch = async () => {
    const zip = pharmSearchZip.trim().replace(/\D/g, "").slice(0, 5)
    if (zip.length !== 5) {
      toast.error("Enter a valid 5-digit zip code")
      return
    }
    setPharmNpiLoading(true)
    setPharmNpiError(null)
    try {
      const params = new URLSearchParams({ postal_code: zip })
      if (pharmSearchRadius && pharmSearchRadius !== "0") params.set("radius_miles", pharmSearchRadius)
      if (pharmSearchName.trim()) params.set("name", pharmSearchName.trim())
      const res = await fetch(`/api/npi-pharmacy-search?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) {
        setPharmNpiError(data.error ?? "Search failed")
        setPharmNpiResults([])
        return
      }
      setPharmNpiResults(data.results ?? [])
      setPharmNpiPage(0)
      setAddPharmMode("results")
    } catch {
      setPharmNpiError("Failed to search pharmacies")
      setPharmNpiResults([])
    } finally {
      setPharmNpiLoading(false)
    }
  }

  const handleSelectPharmacyNpi = (dto: NPIResultDTO) => {
    const name = getOrganizationDisplayName(dto)
    const pharmacy: Pharmacy = {
      name,
      phone: dto.phone ?? "",
      address: formatPharmacyAddress(dto.facilityAddress) ?? "",
    }
    updateClient(client.id, { pharmacies: [...(client.pharmacies ?? []), pharmacy] })
    logActivity(`Pharmacy added: ${pharmacy.name}`)
    toast.success("Pharmacy added")
    setPharmDialogOpen(false)
    setAddPharmMode("search")
    setPharmNpiResults(null)
  }

  const handleAddAllergy = () => {
    if (!newAllergy.trim()) return
    updateClient(client.id, { allergies: [...client.allergies, newAllergy.trim()] })
    logActivity(`Allergy added: ${newAllergy.trim()}`)
    setNewAllergy("")
    setAddAllergyOpen(false)
    toast.success("Allergy added")
  }

  const handleRemoveAllergy = (allergy: string) => {
    updateClient(client.id, { allergies: client.allergies.filter((a) => a !== allergy) })
    logActivity(`Allergy removed: ${allergy}`)
    toast.success("Allergy removed")
  }

  const handleEditAllergy = () => {
    if (!editingAllergy.value.trim() || editingAllergy.value === editingAllergy.original) {
      setEditAllergyOpen(false)
      return
    }
    const updated = client.allergies.map((a) =>
      a === editingAllergy.original ? editingAllergy.value.trim() : a
    )
    updateClient(client.id, { allergies: updated })
    logActivity(`Allergy updated: ${editingAllergy.original} → ${editingAllergy.value.trim()}`)
    toast.success("Allergy updated")
    setEditAllergyOpen(false)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Doctors */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2.5 text-sm font-semibold sm:text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Stethoscope className="h-4 w-4 text-primary" />
            </div>
            Doctors
          </CardTitle>
          <Dialog
            open={addDoctorOpen}
            onOpenChange={(open) => {
              if (!open) {
                setEditDoctorIndex(null)
                setAddDoctorMode("search")
                setNpiSearchResults(null)
                setNpiSearchError(null)
              }
              setAddDoctorOpen(open)
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => openDoctorForm()}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] grid grid-rows-[auto_1fr_auto] gap-4">
              <DialogHeader>
                <DialogTitle>
                  {editDoctorIndex !== null
                    ? "Edit Doctor"
                    : addDoctorMode === "manual"
                      ? "Add Doctor"
                      : addDoctorMode === "results"
                        ? "Select a provider"
                        : "Search for a doctor"}
                </DialogTitle>
              </DialogHeader>

              {editDoctorIndex !== null || addDoctorMode === "manual" ? (
                <>
                  <div className="min-h-0 overflow-y-auto -mx-1 px-1 pb-3">
                    <div className="grid gap-3 py-2">
                    <div>
                      <Label htmlFor="doc-name">Doctor Name</Label>
                      <Input
                        id="doc-name"
                        placeholder="Dr. Jane Smith"
                        value={doctorForm.name}
                        onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Or use First / Last name below (e.g. from NPI)
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="doc-first-name">First Name</Label>
                        <Input
                          id="doc-first-name"
                          placeholder="Jane"
                          value={doctorForm.firstName ?? ""}
                          onChange={(e) => setDoctorForm({ ...doctorForm, firstName: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="doc-last-name">Last Name</Label>
                        <Input
                          id="doc-last-name"
                          placeholder="Smith"
                          value={doctorForm.lastName ?? ""}
                          onChange={(e) => setDoctorForm({ ...doctorForm, lastName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="doc-specialty">Specialty</Label>
                      <Select
                        value={doctorForm.specialty || DEFAULT_SPECIALTY}
                        onValueChange={(value) => setDoctorForm({ ...doctorForm, specialty: value })}
                      >
                        <SelectTrigger id="doc-specialty">
                          <SelectValue placeholder="Select specialty" />
                        </SelectTrigger>
                        <SelectContent side="bottom" position="popper" className="max-h-64">
                          {SPECIALTY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.label} value={opt.label}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="doc-phone">Phone</Label>
                      <Input
                        id="doc-phone"
                        placeholder="(555) 123-4567"
                        value={doctorForm.phone}
                        onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="doc-provider-id">Provider ID (NPI)</Label>
                      <Input
                        id="doc-provider-id"
                        placeholder="1234567890"
                        value={doctorForm.providerId ?? ""}
                        onChange={(e) => setDoctorForm({ ...doctorForm, providerId: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="doc-facility-address">Facility Address</Label>
                      <Textarea
                        id="doc-facility-address"
                        placeholder="123 Main St, City, ST 12345"
                        value={doctorForm.facilityAddress ?? ""}
                        onChange={(e) => setDoctorForm({ ...doctorForm, facilityAddress: e.target.value })}
                        rows={2}
                        className="resize-none"
                      />
                    </div>
                    <div>
                      <Label htmlFor="doc-importance">Importance</Label>
                      <Select
                        value={doctorForm.importance ?? DEFAULT_IMPORTANCE}
                        onValueChange={(value) =>
                          setDoctorForm({ ...doctorForm, importance: value as DoctorImportance })
                        }
                      >
                        <SelectTrigger id="doc-importance">
                          <SelectValue placeholder="Importance" />
                        </SelectTrigger>
                        <SelectContent>
                          {IMPORTANCE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {editDoctorIndex !== null && (
                    <div className="mt-2">
                      <Label htmlFor="doc-note">Note</Label>
                      <Textarea
                        id="doc-note"
                        placeholder="e.g. special instructions for the consumer"
                        value={doctorForm.note ?? ""}
                        onChange={(e) => setDoctorForm({ ...doctorForm, note: e.target.value })}
                        rows={3}
                        className="resize-none text-sm mt-1.5"
                      />
                    </div>
                  )}
                  </div>
                  <DialogFooter>
                    {addDoctorMode === "manual" && (
                      <Button
                        variant="ghost"
                        className="mr-auto"
                        onClick={() => {
                          setAddDoctorMode("search")
                          setNpiSearchResults(null)
                          setNpiSearchError(null)
                        }}
                      >
                        Back to search
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setAddDoctorOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveDoctor}
                      disabled={
                        !doctorForm.name?.trim() &&
                        !doctorForm.firstName?.trim() &&
                        !doctorForm.lastName?.trim()
                      }
                    >
                      {editDoctorIndex !== null ? "Save" : "Add Doctor"}
                    </Button>
                  </DialogFooter>
                </>
              ) : addDoctorMode === "results" && npiSearchResults !== null ? (
                <>
                  <div className="min-w-0 w-full overflow-hidden py-2">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground -ml-1"
                        onClick={() => setAddDoctorMode("search")}
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to search
                      </Button>
                      {npiSearchResults.length > NPI_RESULTS_PER_PAGE && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => setNpiSearchPage((p) => Math.max(0, p - 1))}
                            disabled={npiSearchPage === 0}
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Previous
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => {
                              setNpiSearchPage((p) =>
                                Math.min(
                                  Math.ceil(npiSearchResults.length / NPI_RESULTS_PER_PAGE) - 1,
                                  p + 1
                                )
                              )
                            }}
                            disabled={
                              npiSearchPage >=
                              Math.ceil(npiSearchResults.length / NPI_RESULTS_PER_PAGE) - 1
                            }
                          >
                            Next
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {npiSearchResults.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No providers found. Try different criteria or add manually.</p>
                    ) : (
                      <ScrollArea className="h-[320px] w-full min-w-0 max-w-full rounded-md overflow-hidden">
                        <div className="space-y-3 pr-2 w-full min-w-0 max-w-full overflow-x-hidden">
                          {npiSearchResults
                            .slice(
                              npiSearchPage * NPI_RESULTS_PER_PAGE,
                              (npiSearchPage + 1) * NPI_RESULTS_PER_PAGE
                            )
                            .map((r, idx) => {
                              const rawDisplayName =
                                r.entityType === "organization"
                                  ? (r.organizationName ?? "Unknown")
                                  : [r.lastName, r.firstName].filter(Boolean).join(", ") ||
                                    [r.firstName, r.lastName].filter(Boolean).join(" ") ||
                                    "Unknown"
                              const displayName = toTitleCase(rawDisplayName)
                              const isOrg = r.entityType === "organization"
                              return (
                                <button
                                  key={`${r.npi}-${idx}`}
                                  type="button"
                                  onClick={() => handleSelectNpiDoctor(r)}
                                  className="w-full text-left rounded-lg border bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-shadow p-3 flex flex-col gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div
                                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${
                                        isOrg ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                                      }`}
                                    >
                                      {isOrg ? (
                                        <Hospital className="h-4 w-4" />
                                      ) : (
                                        <DoctorIcon className="h-4 w-4" />
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-semibold text-sm truncate">{displayName}</p>
                                      {r.specialty && (
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                          {toTitleCase(r.specialty)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  {r.facilityAddress && (
                                    <div className="flex items-start gap-2 text-muted-foreground">
                                      <MapPin className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary/70" />
                                      <p className="text-xs truncate" title={formatPharmacyAddress(r.facilityAddress)}>
                                        {formatPharmacyAddress(r.facilityAddress)}
                                      </p>
                                    </div>
                                  )}
                                  {r.phone && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                      <Phone className="h-3.5 w-3.5 shrink-0 text-primary/70" />
                                      <p className="text-xs">{r.phone}</p>
                                    </div>
                                  )}
                                  <div className="flex justify-end mt-1">
                                    <Badge
                                      variant="secondary"
                                      className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 font-mono text-xs"
                                    >
                                      NPI {r.npi}
                                    </Badge>
                                  </div>
                                </button>
                              )
                            })}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddDoctorOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="outline" onClick={() => setAddDoctorMode("manual")}>
                      Add manually
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <div className="grid gap-3 py-2">
                    <div>
                      <Label htmlFor="npi-city">City</Label>
                      <Input
                        id="npi-city"
                        placeholder="City"
                        value={doctorSearchCity}
                        onChange={(e) => setDoctorSearchCity(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="npi-state">State</Label>
                      <Input
                        id="npi-state"
                        placeholder="OH"
                        value={doctorSearchState}
                        onChange={(e) => setDoctorSearchState(e.target.value)}
                        maxLength={2}
                      />
                    </div>
                    <div>
                      <Label htmlFor="npi-specialty">Specialty</Label>
                      <Select
                        value={doctorSearchSpecialty}
                        onValueChange={setDoctorSearchSpecialty}
                      >
                        <SelectTrigger id="npi-specialty">
                          <SelectValue placeholder="Select specialty" />
                        </SelectTrigger>
                        <SelectContent side="bottom" position="popper" className="max-h-64">
                          {SPECIALTY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.label} value={opt.label}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="npi-lastname">Last Name - optional</Label>
                      <Input
                        id="npi-lastname"
                        placeholder="Last name"
                        value={doctorSearchLastName}
                        onChange={(e) => setDoctorSearchLastName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="npi-facility">Facility Name - optional</Label>
                      <Input
                        id="npi-facility"
                        placeholder="Facility name"
                        value={doctorSearchFacilityName}
                        onChange={(e) => setDoctorSearchFacilityName(e.target.value)}
                      />
                    </div>
                    {npiSearchError && (
                      <p className="text-sm text-destructive">{npiSearchError}</p>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setAddDoctorOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleNpiSearch}
                      disabled={npiSearchLoading || !doctorSearchCity.trim() || !doctorSearchState.trim()}
                    >
                      {npiSearchLoading ? (
                        "Searching..."
                      ) : (
                        <>
                          <Search className="mr-1.5 h-4 w-4" />
                          Search
                        </>
                      )}
                    </Button>
                    <Button onClick={() => setAddDoctorMode("manual")}>
                      Add manually
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {client.doctors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Stethoscope className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">No doctors on file</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add a doctor to keep their information handy.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {client.doctors.map((doc, i) => (
                <div key={i} className="px-2 py-3.5">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{doctorDisplayName(doc)}</p>
                      <p className="text-xs text-muted-foreground">
                        {doc.specialty}
                        {doc.phone && ` · ${doc.phone}`}
                      </p>
                      {(doc.facilityAddress || doc.providerId) && (
                        <p className="mt-0.5 text-xs text-muted-foreground truncate" title={doc.facilityAddress}>
                          {doc.facilityAddress}
                          {doc.providerId && ` · NPI: ${doc.providerId}`}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-medium py-0.5 px-1.5 h-6 border ${importancePillClass(doc.importance)}`}
                      >
                        {importanceLabel(doc.importance)}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            aria-label={`Options for ${doctorDisplayName(doc)}`}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openDoctorForm(doc, i)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRemoveDoctor(i)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {doc.note?.trim() && (
                    <Collapsible defaultOpen={false} className="group mt-1.5">
                      <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                        <StickyNote className="h-3.5 w-3.5 shrink-0" />
                        Note
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <p className="mt-1.5 text-xs text-muted-foreground whitespace-pre-wrap border-l-2 border-muted pl-5 py-0.5">
                          {doc.note}
                        </p>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Medications */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2.5 text-sm font-semibold sm:text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/10">
              <Pill className="h-4 w-4 text-chart-3" />
            </div>
            Medications
          </CardTitle>
          <Dialog
            open={addMedOpen}
            onOpenChange={(open) => {
              if (!open) setEditMedIndex(null)
              setAddMedOpen(open)
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => openMedForm()}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] grid grid-rows-[auto_1fr_auto] gap-4">
              <DialogHeader>
                <DialogTitle>
                  {editMedIndex !== null ? "Edit Medication" : "Add a Drug"}
                </DialogTitle>
              </DialogHeader>
              <div className="min-h-0 overflow-y-auto -mx-1 px-1 pb-3">
                <div className="grid gap-3 py-2">
                  <div>
                    <Label htmlFor="med-name">Type drug name and select from dropdown</Label>
                    <Popover
                      open={drugSearchQuery.length >= 2 && editMedIndex === null}
                    >
                      <PopoverTrigger asChild>
                        <div className="relative">
                          <Input
                            id="med-name"
                            placeholder="e.g. lisinopril"
                            value={medForm.name || drugSearchQuery}
                            onChange={(e) => {
                              const v = e.target.value
                              setDrugSearchQuery(v)
                              if (medForm.name) {
                                setMedForm({ ...medForm, name: "", dosage: "" })
                                setDosageProductsForSelectedDrug([])
                                setDosageProductsForDrugName(null)
                              }
                            }}
                            onFocus={() => {}}
                            autoComplete="off"
                            className="pr-8"
                          />
                        </div>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                        align="start"
                        onOpenAutoFocus={(e) => e.preventDefault()}
                      >
                        <Command className="rounded-lg border-0 shadow-none" shouldFilter={false}>
                          <CommandList>
                            <CommandEmpty>
                              {drugSearchLoading ? (
                                <div className="flex items-center gap-2 py-2 px-2 text-muted-foreground">
                                  <div
                                    className="h-4 w-4 shrink-0 rounded-full border-2 border-current border-t-transparent animate-spin"
                                    aria-hidden
                                  />
                                  <span>Searching...</span>
                                </div>
                              ) : (
                                "No results found"
                              )}
                            </CommandEmpty>
                            {typeaheadSuggestions.map((name) => (
                              <CommandItem
                                key={name}
                                value={name}
                                onSelect={() => {
                                  setMedForm((prev) => ({
                                    ...prev,
                                    name,
                                    dosage: "",
                                    brandName: "",
                                  }))
                                  setDrugSearchQuery("")
                                  setTypeaheadSuggestions([])
                                  setDosageProductsForDrugName(null)
                                  setDosageProductsForSelectedDrug([])
                                  setDosageProductsLoading(true)
                                  const params = new URLSearchParams({ name })
                                  fetch(`/api/drug-search/variants?${params.toString()}`)
                                    .then((res) => res.json())
                                    .then((data: { rxcui?: string | null; products?: DrugProductDTO[] }) => {
                                      const list = data.products ?? []
                                      setDosageProductsForSelectedDrug(list)
                                      setDosageProductsForDrugName(name)
                                      setDrugSearchProducts(list)
                                      const defaultProduct =
                                        list.find((p) => p.isDefault) ?? list[0]
                                      if (defaultProduct) {
                                        setMedForm((prev) => ({
                                          ...prev,
                                          name,
                                          drugName: name,
                                          dosage: defaultProduct.dosageDisplay,
                                          dosageDisplay: defaultProduct.dosageDisplay,
                                          doseForm: defaultProduct.doseForm ?? "",
                                          isPackageDrug: isPackageRequiredForm(
                                            defaultProduct.doseForm ?? ""
                                          ),
                                          rxcui: defaultProduct.rxcui,
                                          brandName: defaultProduct.brandName ?? "",
                                        }))
                                      }
                                    })
                                    .catch(() => {
                                      setDosageProductsForSelectedDrug([])
                                      setDosageProductsForDrugName(null)
                                    })
                                    .finally(() => setDosageProductsLoading(false))
                                }}
                              >
                                {name}
                              </CommandItem>
                            ))}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="grid grid-cols-[1fr_1fr] gap-3">
                    <div>
                      <Label htmlFor="med-dosage">Dosage</Label>
                      {editMedIndex !== null ||
                      (dosageOptionsForSelectedDrug.length === 0 && !dosageProductsLoading) ? (
                        <Input
                          id="med-dosage"
                          placeholder={
                            dosageProductsLoading ? "Loading dosages..." : "e.g. 10mg"
                          }
                          value={medForm.dosage}
                          onChange={(e) => setMedForm({ ...medForm, dosage: e.target.value })}
                          disabled={dosageProductsLoading}
                        />
                      ) : (
                        <select
                          id="med-dosage"
                          value={medForm.dosage}
                          onChange={(e) => {
                            const v = e.target.value
                            const p = dosageProductsForDropdown.find(
                              (x) => x.dosageDisplay === v
                            )
                            setMedForm((prev) => ({
                              ...prev,
                              dosage: v,
                              dosageDisplay: v,
                              doseForm: p?.doseForm ?? "",
                              isPackageDrug: p
                                ? isPackageRequiredForm(p.doseForm ?? "")
                                : false,
                              rxcui: p?.rxcui ?? prev.rxcui,
                              packageDescription: "",
                              packageNdc: "",
                              brandName: p?.brandName ?? "",
                            }))
                            setPackageOptions([])
                            setSelectedPackageNdc(null)
                          }}
                          disabled={dosageProductsLoading}
                          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">
                            {dosageProductsLoading ? "Loading dosages..." : "Select dosage"}
                          </option>
                          {dosageProductsForDropdown.map((p) => (
                            <option key={p.dosageDisplay} value={p.dosageDisplay}>
                              {p.dosageDisplay}
                              {p.isDefault ? " (suggested default)" : ""}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    {(editMedIndex !== null ||
                      (selectedIsPackageDrug &&
                        (packageOptions.length > 0 || packagesLoading))) && (
                      <div>
                        <Label htmlFor="med-package">Package</Label>
                        {editMedIndex !== null ? (
                          <Input
                            id="med-package"
                            placeholder="Optional"
                            value={
                              medForm.packageDescription ||
                              medForm.package ||
                              ""
                            }
                            onChange={(e) =>
                              setMedForm({
                                ...medForm,
                                package: e.target.value,
                                packageDescription: e.target.value,
                              })
                            }
                          />
                        ) : packagesLoading ? (
                          <Input
                            id="med-package"
                            placeholder="Loading packages..."
                            disabled
                            className="text-muted-foreground"
                          />
                        ) : showPackageDropdown ? (
                          <Select
                            value={selectedPackageNdc ?? ""}
                            onValueChange={(ndc) => {
                              const pkg = packageOptions.find((p) => p.packageNdc === ndc)
                              setSelectedPackageNdc(ndc)
                              setMedForm((prev) => ({
                                ...prev,
                                packageDescription: pkg?.packageDescription ?? "",
                                packageNdc: pkg?.packageNdc ?? "",
                              }))
                            }}
                          >
                            <SelectTrigger id="med-package" className="[&>*:first-child]:pl-0">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {packageOptions.map((pkg) => (
                                <SelectItem
                                  key={pkg.packageNdc}
                                  value={pkg.packageNdc}
                                  hideIndicator
                                >
                                  {pkg.packageDescription}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : packageOptions.length === 1 ? (
                          <Input
                            id="med-package"
                            value={medForm.packageDescription ?? packageOptions[0]?.packageDescription}
                            readOnly
                            className="bg-muted/50 text-muted-foreground cursor-default"
                            aria-readonly
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-[1fr_1fr] gap-3">
                    <div>
                      <Label htmlFor="med-quantity">Quantity</Label>
                      <Input
                        id="med-quantity"
                        type="number"
                        min={1}
                        placeholder="30"
                        value={medForm.quantity ?? 30}
                        onChange={(e) =>
                          setMedForm({
                            ...medForm,
                            quantity: parseInt(e.target.value, 10) || undefined,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="med-frequency">Frequency/Fill</Label>
                      <Select
                        value={medForm.frequency || DEFAULT_FREQUENCY_FILL}
                        onValueChange={(v) => setMedForm({ ...medForm, frequency: v })}
                      >
                        <SelectTrigger id="med-frequency" className="[&>*:first-child]:pl-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FREQUENCY_FILL_OPTIONS.map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="med-notes">Notes</Label>
                    <Textarea
                      id="med-notes"
                      placeholder="Optional"
                      value={medForm.notes ?? ""}
                      onChange={(e) => setMedForm({ ...medForm, notes: e.target.value })}
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  <div>
                    <Label htmlFor="med-first-prescribed">First Prescribed</Label>
                    <DatePicker
                      id="med-first-prescribed"
                      value={medForm.firstPrescribed?.slice(0, 10) ?? ""}
                      onChange={(v) =>
                        setMedForm({ ...medForm, firstPrescribed: v || undefined })
                      }
                      placeholder="Pick a date"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                {editMedIndex !== null ? (
                  <>
                    <Button variant="outline" onClick={() => setAddMedOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveMed} disabled={!medNameForSave}>
                      Save
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      variant="default"
                      className="bg-violet-600 hover:bg-violet-700"
                      onClick={handleSaveMedAndAddMore}
                      disabled={!medNameForSave}
                    >
                      Save & Add More
                    </Button>
                    <Button onClick={handleSaveMedAndDone} disabled={!medNameForSave}>
                      Save & Done
                    </Button>
                    <Button variant="outline" onClick={() => setAddMedOpen(false)}>
                      Close
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {client.medications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Pill className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">No medications on file</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add medications to track what this client takes.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {client.medications.map((med, i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-2 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{med.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[
                        med.dosageDisplay ?? med.dosage,
                        med.quantity != null ? `Qty ${med.quantity}` : null,
                        med.frequency,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    {med.notes ? (
                      <p className="text-xs text-muted-foreground mt-0.5 italic">{med.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {med.brandName ? (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium py-0.5 px-1.5 h-6 border bg-destructive/15 text-destructive border-destructive/30"
                      >
                        Brand
                      </Badge>
                    ) : null}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label={`Options for ${med.name}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openMedForm(med, i)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRemoveMed(i)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pharmacies */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2.5 text-sm font-semibold sm:text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
              <Building2 className="h-4 w-4 text-chart-2" />
            </div>
            Pharmacies
          </CardTitle>
          <Dialog
            open={pharmDialogOpen}
            onOpenChange={(open) => {
              if (!open) {
                setEditPharmIndex(null)
                setAddPharmMode("search")
                setPharmNpiResults(null)
              }
              setPharmDialogOpen(open)
            }}
          >
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => openPharmForm()}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md max-h-[90vh] grid grid-rows-[auto_1fr_auto] gap-4">
              <DialogHeader>
                <DialogTitle>
                  {editPharmIndex !== null
                    ? "Edit Pharmacy"
                    : addPharmMode === "manual"
                      ? "Add Pharmacy"
                      : addPharmMode === "results"
                        ? "Select pharmacy(s)"
                        : "New Pharmacy"}
                </DialogTitle>
              </DialogHeader>

              {editPharmIndex !== null || addPharmMode === "manual" ? (
                <>
                  <div className="min-h-0 overflow-y-auto -mx-1 px-1 pb-3">
                    <div className="grid gap-3 py-2">
                      <div>
                        <Label htmlFor="pharm-name">Pharmacy Name</Label>
                        <Input
                          id="pharm-name"
                          placeholder="CVS Pharmacy"
                          value={pharmForm.name}
                          onChange={(e) => setPharmForm({ ...pharmForm, name: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="pharm-phone">Phone</Label>
                        <Input
                          id="pharm-phone"
                          placeholder="(555) 123-4567"
                          value={pharmForm.phone}
                          onChange={(e) => setPharmForm({ ...pharmForm, phone: e.target.value })}
                        />
                      </div>
                      <div>
                        <Label htmlFor="pharm-address">Address</Label>
                        <Input
                          id="pharm-address"
                          placeholder="123 Main St, City, State 12345"
                          value={pharmForm.address}
                          onChange={(e) => setPharmForm({ ...pharmForm, address: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    {addPharmMode === "manual" && (
                      <Button
                        variant="ghost"
                        className="mr-auto"
                        onClick={() => {
                          setAddPharmMode("search")
                          setPharmNpiResults(null)
                          setPharmNpiError(null)
                        }}
                      >
                        <ArrowLeft className="mr-1.5 h-4 w-4" />
                        Back to search
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setPharmDialogOpen(false)}>
                      {editPharmIndex !== null ? "Cancel" : "Close"}
                    </Button>
                    <Button onClick={handleSavePharmacy} disabled={!pharmForm.name.trim()}>
                      {editPharmIndex !== null ? "Save" : "Add"} Pharmacy
                    </Button>
                  </DialogFooter>
                </>
              ) : addPharmMode === "results" && pharmNpiResults !== null ? (
                <>
                  <div className="min-w-0 w-full overflow-hidden py-2">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-1.5 px-3 text-xs text-muted-foreground hover:text-foreground -ml-1"
                        onClick={() => setAddPharmMode("search")}
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to search
                      </Button>
                      {pharmNpiResults.length > PHARM_RESULTS_PER_PAGE && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() => setPharmNpiPage((p) => Math.max(0, p - 1))}
                            disabled={pharmNpiPage === 0}
                          >
                            <ChevronLeft className="h-3.5 w-3.5" />
                            Previous
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 gap-1 text-xs"
                            onClick={() =>
                              setPharmNpiPage((p) =>
                                Math.min(
                                  Math.ceil(pharmNpiResults.length / PHARM_RESULTS_PER_PAGE) - 1,
                                  p + 1
                                )
                              )
                            }
                            disabled={
                              pharmNpiPage >=
                              Math.ceil(pharmNpiResults.length / PHARM_RESULTS_PER_PAGE) - 1
                            }
                          >
                            Next
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {pharmNpiResults.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No pharmacies found. Try different criteria or add manually.
                      </p>
                    ) : (
                      <ScrollArea className="h-[320px] w-full min-w-0 max-w-full rounded-md overflow-hidden">
                        <div className="space-y-3 pr-2 w-full min-w-0 max-w-full overflow-x-hidden">
                          {pharmNpiResults
                            .slice(
                              pharmNpiPage * PHARM_RESULTS_PER_PAGE,
                              (pharmNpiPage + 1) * PHARM_RESULTS_PER_PAGE
                            )
                            .map((r, idx) => (
                              <button
                                key={`${r.npi}-${idx}`}
                                type="button"
                                onClick={() => handleSelectPharmacyNpi(r)}
                                className="w-full text-left rounded-lg border bg-card shadow-sm hover:shadow-md hover:border-primary/30 transition-shadow p-3 flex flex-col gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              >
                                <div className="flex items-start gap-3 min-w-0">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-chart-2/10 text-chart-2">
                                    <Building2 className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-sm truncate">
                                      {getOrganizationDisplayName(r)}
                                    </p>
                                    {r.facilityAddress ? (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <MapPin className="h-3 w-3 shrink-0" />
                                        <span className="truncate">{formatPharmacyAddress(r.facilityAddress)}</span>
                                      </p>
                                    ) : null}
                                    {r.phone ? (
                                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                        <Phone className="h-3 w-3 shrink-0" />
                                        {r.phone}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </button>
                            ))}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPharmDialogOpen(false)}>
                      Close
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <>
                  <div className="min-h-0 overflow-y-auto -mx-1 px-1 pb-3">
                    <div className="grid gap-3 py-2">
                      <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
                        <div>
                          <Label htmlFor="pharm-search-zip">Zip Code</Label>
                          <Input
                            id="pharm-search-zip"
                            placeholder="12345"
                            value={pharmSearchZip}
                            onChange={(e) => setPharmSearchZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                            maxLength={5}
                          />
                        </div>
                        <div className="w-[120px]">
                          <Label htmlFor="pharm-search-radius">Radius</Label>
                          <Select
                            value={pharmSearchRadius}
                            onValueChange={setPharmSearchRadius}
                          >
                            <SelectTrigger id="pharm-search-radius">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PHARM_RADIUS_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="pharm-search-name">Pharmacy Name</Label>
                        <Input
                          id="pharm-search-name"
                          placeholder="optional"
                          value={pharmSearchName}
                          onChange={(e) => setPharmSearchName(e.target.value)}
                        />
                      </div>
                      {pharmNpiError && (
                        <p className="text-sm text-destructive">{pharmNpiError}</p>
                      )}
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setPharmDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePharmacySearch}
                      disabled={pharmNpiLoading || pharmSearchZip.trim().replace(/\D/g, "").length !== 5}
                    >
                      {pharmNpiLoading ? (
                        "Searching..."
                      ) : (
                        <>
                          <Search className="mr-1.5 h-4 w-4" />
                          Search
                        </>
                      )}
                    </Button>
                    <Button onClick={() => setAddPharmMode("manual")}>
                      Add manually
                    </Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {!(client.pharmacies ?? []).length ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
                <Building2 className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="mt-3 text-sm font-medium text-muted-foreground">No pharmacy on file</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add pharmacy details for prescriptions.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {(client.pharmacies ?? []).map((pharm, i) => (
                <div key={i} className="flex items-center justify-between gap-4 px-2 py-3.5">
                  <div className="min-w-0 flex-1 space-y-0.5 text-sm">
                    <p className="font-medium text-foreground">{pharm.name}</p>
                    <p className="text-muted-foreground">{pharm.phone}</p>
                    <p className="text-muted-foreground">{pharm.address}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          aria-label={`Options for ${pharm.name}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openPharmForm(pharm, i)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRemovePharmacy(i)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Health Tracker */}
      <Card className="overflow-hidden lg:col-span-2">
        <CardHeader className="border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2.5 text-sm font-semibold sm:text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-1/10">
              <Heart className="h-4 w-4 text-chart-1" />
            </div>
            Health Tracker
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 pt-4">
          <p className="text-sm text-muted-foreground mb-3">
            Select conditions, disorders, or diseases that apply to this consumer.
          </p>
          <ScrollArea className="h-[400px] rounded-md border p-3">
            <div className="flex flex-col sm:flex-row gap-6 min-h-0">
              {[HEALTH_TRACKER_GROUPS.slice(0, 9), HEALTH_TRACKER_GROUPS.slice(9)].map(
                (columnGroups, colIndex) => (
                  <div
                    key={colIndex}
                    className="flex-1 min-w-0 flex flex-col gap-4 items-start text-left"
                  >
                    {columnGroups.map((group) => {
                      const CategoryIcon = group.icon
                      return (
                      <div key={group.label} className="space-y-1.5 w-full">
                        <div className="flex items-center justify-start gap-2 font-semibold text-foreground">
                          <CategoryIcon className="h-4 w-4 shrink-0 text-destructive/90" />
                          <span>{group.label}</span>
                        </div>
                        <div className="space-y-1 text-left">
                          {group.items.map((option) => {
                            const selected = (client.healthTracker ?? []).includes(option)
                            return (
                              <label
                                key={option}
                                className="flex items-center justify-start gap-2 py-0.5 text-sm cursor-pointer hover:bg-muted/50 rounded px-1.5 -mx-1.5 font-normal text-muted-foreground hover:text-foreground text-left"
                              >
                                <Checkbox
                                  checked={selected}
                                  onCheckedChange={(checked) => {
                                    const current = client.healthTracker ?? []
                                    const next = checked
                                      ? [...current, option]
                                      : current.filter((c) => c !== option)
                                    updateClient(client.id, { healthTracker: next })
                                    if (checked) {
                                      toast.success("Tracker has been added")
                                    } else {
                                      toast.success("Tracker removed")
                                    }
                                  }}
                                />
                                <span>{option}</span>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    )
                    })}
                  </div>
                )
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Allergies */}
      <Card className="overflow-hidden lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b bg-muted/30 py-4">
          <CardTitle className="flex items-center gap-2.5 text-sm font-semibold sm:text-base">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </div>
            Allergies
          </CardTitle>
          <Dialog open={addAllergyOpen} onOpenChange={setAddAllergyOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Add Allergy</DialogTitle>
              </DialogHeader>
              <div className="py-2">
                <Label htmlFor="allergy-name">Allergy</Label>
                <Input
                  id="allergy-name"
                  placeholder="Penicillin"
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddAllergyOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddAllergy} disabled={!newAllergy.trim()}>
                  Add
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="pt-3.5">
            <div className="flex flex-wrap gap-2">
              {client.allergies.length === 0 ? (
                <span className="text-sm text-muted-foreground">None reported</span>
              ) : (
                client.allergies.map((a) => (
                  <Badge
                    key={a}
                    variant="outline"
                    className="flex cursor-default items-center gap-0.5 border-destructive/20 bg-destructive/10 text-destructive text-xs"
                  >
                    {a}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 shrink-0 rounded-full p-0 hover:bg-destructive/20"
                          aria-label={`Options for ${a}`}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingAllergy({ value: a, original: a })
                            setEditAllergyOpen(true)
                          }}
                        >
                          <Pencil className="mr-2 h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleRemoveAllergy(a)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Badge>
                ))
              )}
            </div>
            <Dialog open={editAllergyOpen} onOpenChange={setEditAllergyOpen}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle>Edit Allergy</DialogTitle>
                </DialogHeader>
                <div className="py-2">
                  <Label htmlFor="edit-allergy">Allergy</Label>
                  <Input
                    id="edit-allergy"
                    value={editingAllergy.value}
                    onChange={(e) =>
                      setEditingAllergy((prev) => ({ ...prev, value: e.target.value }))
                    }
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditAllergyOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditAllergy} disabled={!editingAllergy.value.trim()}>
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
