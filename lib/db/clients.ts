import type { Client } from "@/lib/types"
import { createClient } from "@/lib/supabase/server"
import { encrypt } from "@/lib/encryption"
import { logPhiAccess } from "@/lib/db/phi-access-log"

const COUNTY_SUFFIX_REGEX = /\s+county$/i
const COUNTY_JURISDICTION_SUFFIX_REGEX =
  /\s+(county|parish|borough|census area|municipality|city and borough)$/i

function normalizeCountyForStorage(value?: string | null): string | null {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return null
  return trimmed.replace(COUNTY_SUFFIX_REGEX, "").trim() || null
}

function formatCountyForDisplay(value?: string | null): string | undefined {
  const trimmed = (value ?? "").trim()
  if (!trimmed) return undefined
  if (COUNTY_JURISDICTION_SUFFIX_REGEX.test(trimmed)) return trimmed
  return `${trimmed} County`
}

export async function fetchClients(agentId: string): Promise<Client[]> {
  const supabase = await createClient()
  const { data: rows, error } = await supabase
    .from("clients")
    .select("id, first_name, last_name, title, middle_name, suffix, nickname, gender, fun_facts, dob, turning65_date, preferred_contact_method, language, spouse_id, medicare_number, part_a_effective_date, part_b_effective_date, allergies, conditions, health_tracker, source, created_at, updated_at")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
  if (error) throw error
  if (!rows?.length) return []

  const clientIds = rows.map((r) => r.id)
  const [phonesRes, emailsRes, addressesRes, doctorsRes, medsRes, pharmaciesRes, notesRes, coverageRes] =
    await Promise.all([
      supabase.from("client_phones").select("id, client_id, number, type, is_preferred, note").in("client_id", clientIds),
      supabase.from("client_emails").select("id, client_id, value, is_preferred, note").in("client_id", clientIds),
      supabase.from("client_addresses").select("id, client_id, type, address, unit, city, county, state, zip, is_preferred").in("client_id", clientIds),
      supabase.from("client_doctors").select("client_id, name, specialty, phone, first_name, last_name, provider_id, facility_address, importance, note").in("client_id", clientIds),
      supabase.from("client_medications").select("client_id, name, dosage, frequency, quantity, notes, first_prescribed, rxcui, drug_name, dosage_display, dose_form, is_package_drug, package_description, package_ndc, brand_name").in("client_id", clientIds),
      supabase.from("client_pharmacies").select("client_id, name, phone, address").in("client_id", clientIds),
      supabase.from("client_notes").select("client_id, text, created_at, updated_at").in("client_id", clientIds),
      supabase.from("client_coverage").select("client_id, plan_type, carrier, plan_name, effective_date, application_id, premium, last_review_date").in("client_id", clientIds),
    ])

  const byClient = (arr: { client_id: string }[]) => {
    const m: Record<string, typeof arr> = {}
    for (const x of arr) {
      if (!m[x.client_id]) m[x.client_id] = []
      m[x.client_id].push(x)
    }
    return m
  }
  const phonesBy = byClient(phonesRes.data ?? [])
  const emailsBy = byClient(emailsRes.data ?? [])
  const addressesBy = byClient(addressesRes.data ?? [])
  const doctorsBy = byClient(doctorsRes.data ?? [])
  const medsBy = byClient(medsRes.data ?? [])
  const pharmaciesBy = byClient(pharmaciesRes.data ?? [])
  const notesBy = byClient(notesRes.data ?? [])
  const coverageBy = (coverageRes.data ?? []).reduce<{ [key: string]: (typeof coverageRes.data)[number] }>(
    (acc, c) => {
      acc[c.client_id] = c
      return acc
    },
    {}
  )

  return rows.map((c) => {
    const cov = coverageBy[c.id]
    return {
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      title: c.title ?? undefined,
      middleName: c.middle_name ?? undefined,
      suffix: c.suffix ?? undefined,
      nickname: c.nickname ?? undefined,
      gender: c.gender ?? undefined,
      funFacts: c.fun_facts ?? undefined,
      phones: (phonesBy[c.id] ?? []).map((p) => ({
        id: p.id,
        number: p.number,
        type: p.type,
        isPreferred: p.is_preferred,
        note: p.note ?? undefined,
      })),
      emails: (emailsBy[c.id] ?? []).map((e) => ({
        id: e.id,
        value: e.value,
        isPreferred: e.is_preferred,
        note: e.note ?? undefined,
      })),
      addresses: (addressesBy[c.id] ?? []).map((a) => ({
        id: a.id,
        type: a.type,
        address: a.address,
        unit: a.unit ?? undefined,
        city: a.city,
        county: formatCountyForDisplay(a.county),
        state: a.state,
        zip: a.zip,
        isPreferred: a.is_preferred,
      })),
      dob: c.dob,
      turning65Date: c.turning65_date,
      preferredContactMethod: c.preferred_contact_method,
      language: c.language,
      spouseId: c.spouse_id ?? undefined,
      medicareNumber: "",
      hasMedicareNumber: !!(c.medicare_number != null && String(c.medicare_number).trim() !== ""),
      partAEffectiveDate: c.part_a_effective_date ?? "",
      partBEffectiveDate: c.part_b_effective_date ?? "",
      doctors: (doctorsBy[c.id] ?? []).map((d) => ({
        name: d.name,
        specialty: d.specialty,
        phone: d.phone ?? "",
        firstName: d.first_name ?? undefined,
        lastName: d.last_name ?? undefined,
        providerId: d.provider_id ?? undefined,
        facilityAddress: d.facility_address ?? undefined,
        importance: d.importance ?? undefined,
        note: d.note ?? undefined,
      })),
      medications: (medsBy[c.id] ?? []).map((m) => ({
        name: m.name,
        dosage: m.dosage ?? undefined,
        frequency: m.frequency,
        quantity: m.quantity ?? undefined,
        notes: m.notes ?? undefined,
        firstPrescribed: m.first_prescribed ?? undefined,
        rxcui: m.rxcui ?? undefined,
        drugName: m.drug_name ?? undefined,
        dosageDisplay: m.dosage_display ?? undefined,
        doseForm: m.dose_form ?? undefined,
        isPackageDrug: m.is_package_drug ?? undefined,
        packageDescription: m.package_description ?? undefined,
        packageNdc: m.package_ndc ?? undefined,
        brandName: m.brand_name ?? undefined,
      })),
      pharmacies: (pharmaciesBy[c.id] ?? []).map((p) => ({
        name: p.name,
        phone: p.phone ?? "",
        address: p.address ?? "",
      })),
      allergies: c.allergies ?? [],
      conditions: c.conditions ?? [],
      healthTracker: c.health_tracker ?? undefined,
      source: c.source ?? undefined,
      notes: (notesBy[c.id] ?? []).map((n) => ({
        text: n.text,
        createdAt: n.created_at,
        updatedAt: n.updated_at ?? undefined,
      })),
      coverage: cov
        ? {
            planType: cov.plan_type,
            carrier: cov.carrier,
            planName: cov.plan_name,
            effectiveDate: cov.effective_date,
            applicationId: cov.application_id,
            premium: Number(cov.premium),
            lastReviewDate: cov.last_review_date,
          }
        : undefined,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    } as Client
  })
}

export async function insertClient(agentId: string, client: Client): Promise<Client> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const rawMbi = (client.medicareNumber ?? "").trim()
  const medicareNumberDb = rawMbi ? encrypt(rawMbi) : null
  const { error: clientError } = await supabase.from("clients").insert({
    id: client.id,
    agent_id: agentId,
    first_name: client.firstName,
    last_name: client.lastName,
    title: client.title ?? null,
    middle_name: client.middleName ?? null,
    suffix: client.suffix ?? null,
    nickname: client.nickname ?? null,
    gender: client.gender ?? null,
    fun_facts: client.funFacts ?? null,
    dob: client.dob,
    turning65_date: client.turning65Date,
    preferred_contact_method: client.preferredContactMethod,
    language: client.language ?? "English",
    spouse_id: client.spouseId ?? null,
    medicare_number: medicareNumberDb,
    part_a_effective_date: client.partAEffectiveDate ?? null,
    part_b_effective_date: client.partBEffectiveDate ?? null,
    source: client.source ?? null,
    allergies: client.allergies ?? [],
    conditions: client.conditions ?? [],
    health_tracker: client.healthTracker ?? [],
  })
  if (clientError) throw clientError

  await Promise.all([
    (client.phones ?? []).length
      ? supabase.from("client_phones").insert(
          client.phones!.map((p) => ({
            id: p.id,
            client_id: client.id,
            number: p.number,
            type: p.type,
            is_preferred: p.isPreferred,
            note: p.note ?? null,
          }))
        )
      : Promise.resolve(),
    (client.emails ?? []).length
      ? supabase.from("client_emails").insert(
          client.emails!.map((e) => ({
            id: e.id,
            client_id: client.id,
            value: e.value,
            is_preferred: e.isPreferred,
            note: e.note ?? null,
          }))
        )
      : Promise.resolve(),
    (client.addresses ?? []).length
      ? supabase.from("client_addresses").insert(
          client.addresses!.map((a) => ({
            id: a.id,
            client_id: client.id,
            type: a.type,
            address: a.address,
            unit: a.unit ?? null,
            city: a.city,
            county: normalizeCountyForStorage(a.county),
            state: a.state,
            zip: a.zip,
            is_preferred: a.isPreferred,
          }))
        )
      : Promise.resolve(),
    (client.doctors ?? []).length
      ? supabase.from("client_doctors").insert(
          client.doctors!.map((d) => ({
            id: crypto.randomUUID(),
            client_id: client.id,
            name: d.name,
            specialty: d.specialty,
            phone: d.phone ?? null,
            first_name: d.firstName ?? null,
            last_name: d.lastName ?? null,
            provider_id: d.providerId ?? null,
            facility_address: d.facilityAddress ?? null,
            importance: d.importance ?? null,
            note: d.note ?? null,
          }))
        )
      : Promise.resolve(),
    (client.medications ?? []).length
      ? supabase.from("client_medications").insert(
          client.medications!.map((m) => ({
            id: crypto.randomUUID(),
            client_id: client.id,
            name: m.name,
            dosage: m.dosage ?? null,
            frequency: m.frequency,
            quantity: m.quantity ?? null,
            notes: m.notes ?? null,
            first_prescribed: m.firstPrescribed ?? null,
            rxcui: m.rxcui ?? null,
            drug_name: m.drugName ?? null,
            dosage_display: m.dosageDisplay ?? null,
            dose_form: m.doseForm ?? null,
            is_package_drug: m.isPackageDrug ?? null,
            package_description: m.packageDescription ?? null,
            package_ndc: m.packageNdc ?? null,
            brand_name: m.brandName ?? null,
          }))
        )
      : Promise.resolve(),
    (client.pharmacies ?? []).length
      ? supabase.from("client_pharmacies").insert(
          client.pharmacies!.map((p) => ({
            id: crypto.randomUUID(),
            client_id: client.id,
            name: p.name,
            phone: p.phone ?? null,
            address: p.address ?? null,
          }))
        )
      : Promise.resolve(),
    (client.notes ?? []).length
      ? supabase.from("client_notes").insert(
          client.notes!.map((n) => ({
            id: crypto.randomUUID(),
            client_id: client.id,
            text: n.text,
            created_at: n.createdAt,
            updated_at: n.updatedAt ?? null,
          }))
        )
      : Promise.resolve(),
    client.coverage
      ? supabase.from("client_coverage").insert({
          client_id: client.id,
          plan_type: client.coverage.planType,
          carrier: client.coverage.carrier,
          plan_name: client.coverage.planName,
          effective_date: client.coverage.effectiveDate,
          application_id: client.coverage.applicationId,
          premium: client.coverage.premium,
          last_review_date: client.coverage.lastReviewDate,
        })
      : Promise.resolve(),
  ])

  if (rawMbi) {
    await logPhiAccess({
      userId: agentId,
      clientId: client.id,
      fieldAccessed: "medicare_number",
      accessType: "update",
    })
  }

  return { ...client, createdAt: now, updatedAt: now }
}

export async function updateClient(
  agentId: string,
  clientId: string,
  updates: Partial<Client>
): Promise<void> {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const clientRow: Record<string, unknown> = { updated_at: now }
  if (updates.firstName !== undefined) clientRow.first_name = updates.firstName
  if (updates.lastName !== undefined) clientRow.last_name = updates.lastName
  if (updates.title !== undefined) clientRow.title = updates.title
  if (updates.middleName !== undefined) clientRow.middle_name = updates.middleName
  if (updates.suffix !== undefined) clientRow.suffix = updates.suffix
  if (updates.nickname !== undefined) clientRow.nickname = updates.nickname
  if (updates.gender !== undefined) clientRow.gender = updates.gender
  if (updates.funFacts !== undefined) clientRow.fun_facts = updates.funFacts
  if (updates.dob !== undefined) clientRow.dob = updates.dob
  if (updates.turning65Date !== undefined) clientRow.turning65_date = updates.turning65Date
  if (updates.preferredContactMethod !== undefined)
    clientRow.preferred_contact_method = updates.preferredContactMethod
  if (updates.language !== undefined) clientRow.language = updates.language
  if (updates.spouseId !== undefined) clientRow.spouse_id = updates.spouseId
  if (updates.medicareNumber !== undefined) {
    const raw = (updates.medicareNumber ?? "").trim()
    clientRow.medicare_number = raw ? encrypt(raw) : null
  }
  if (updates.partAEffectiveDate !== undefined)
    clientRow.part_a_effective_date = updates.partAEffectiveDate
  if (updates.partBEffectiveDate !== undefined)
    clientRow.part_b_effective_date = updates.partBEffectiveDate
  if (updates.source !== undefined) clientRow.source = updates.source
  if (updates.allergies !== undefined) clientRow.allergies = updates.allergies
  if (updates.conditions !== undefined) clientRow.conditions = updates.conditions
  if (updates.healthTracker !== undefined) clientRow.health_tracker = updates.healthTracker

  if (Object.keys(clientRow).length > 1) {
    const { error } = await supabase
      .from("clients")
      .update(clientRow)
      .eq("id", clientId)
      .eq("agent_id", agentId)
    if (error) throw error
    if (updates.medicareNumber !== undefined) {
      await logPhiAccess({
        userId: agentId,
        clientId,
        fieldAccessed: "medicare_number",
        accessType: "update",
      })
    }
  }

  if (updates.phones !== undefined) {
    await supabase.from("client_phones").delete().eq("client_id", clientId)
    if (updates.phones.length)
      await supabase.from("client_phones").insert(
        updates.phones.map((p) => ({
          id: p.id,
          client_id: clientId,
          number: p.number,
          type: p.type,
          is_preferred: p.isPreferred,
          note: p.note ?? null,
        }))
      )
  }
  if (updates.emails !== undefined) {
    await supabase.from("client_emails").delete().eq("client_id", clientId)
    if (updates.emails.length)
      await supabase.from("client_emails").insert(
        updates.emails.map((e) => ({
          id: e.id,
          client_id: clientId,
          value: e.value,
          is_preferred: e.isPreferred,
          note: e.note ?? null,
        }))
      )
  }
  if (updates.addresses !== undefined) {
    await supabase.from("client_addresses").delete().eq("client_id", clientId)
    if (updates.addresses.length)
      await supabase.from("client_addresses").insert(
        updates.addresses.map((a) => ({
          id: a.id,
          client_id: clientId,
          type: a.type,
          address: a.address,
          unit: a.unit ?? null,
          city: a.city,
          county: normalizeCountyForStorage(a.county),
          state: a.state,
          zip: a.zip,
          is_preferred: a.isPreferred,
        }))
      )
  }
  if (updates.doctors !== undefined) {
    await supabase.from("client_doctors").delete().eq("client_id", clientId)
    if (updates.doctors.length)
      await supabase.from("client_doctors").insert(
        updates.doctors.map((d) => ({
          id: crypto.randomUUID(),
          client_id: clientId,
          name: d.name,
          specialty: d.specialty,
          phone: d.phone ?? null,
          first_name: d.firstName ?? null,
          last_name: d.lastName ?? null,
          provider_id: d.providerId ?? null,
          facility_address: d.facilityAddress ?? null,
          importance: d.importance ?? null,
          note: d.note ?? null,
        }))
      )
  }
  if (updates.medications !== undefined) {
    await supabase.from("client_medications").delete().eq("client_id", clientId)
    if (updates.medications.length)
      await supabase.from("client_medications").insert(
        updates.medications.map((m) => ({
          id: crypto.randomUUID(),
          client_id: clientId,
          name: m.name,
          dosage: m.dosage ?? null,
          frequency: m.frequency,
          quantity: m.quantity ?? null,
          notes: m.notes ?? null,
          first_prescribed: m.firstPrescribed ?? null,
          rxcui: m.rxcui ?? null,
          drug_name: m.drugName ?? null,
          dosage_display: m.dosageDisplay ?? null,
          dose_form: m.doseForm ?? null,
          is_package_drug: m.isPackageDrug ?? null,
          package_description: m.packageDescription ?? null,
          package_ndc: m.packageNdc ?? null,
          brand_name: m.brandName ?? null,
        }))
      )
  }
  if (updates.pharmacies !== undefined) {
    await supabase.from("client_pharmacies").delete().eq("client_id", clientId)
    if (updates.pharmacies.length)
      await supabase.from("client_pharmacies").insert(
        updates.pharmacies.map((p) => ({
          id: crypto.randomUUID(),
          client_id: clientId,
          name: p.name,
          phone: p.phone ?? null,
          address: p.address ?? null,
        }))
      )
  }
  if (updates.notes !== undefined) {
    await supabase.from("client_notes").delete().eq("client_id", clientId)
    if (updates.notes.length)
      await supabase.from("client_notes").insert(
        updates.notes.map((n) => ({
          id: crypto.randomUUID(),
          client_id: clientId,
          text: n.text,
          created_at: n.createdAt,
          updated_at: n.updatedAt ?? null,
        }))
      )
  }
  if (updates.coverage !== undefined) {
    await supabase.from("client_coverage").delete().eq("client_id", clientId)
    if (updates.coverage)
      await supabase.from("client_coverage").insert({
        client_id: clientId,
        plan_type: updates.coverage.planType,
        carrier: updates.coverage.carrier,
        plan_name: updates.coverage.planName,
        effective_date: updates.coverage.effectiveDate,
        application_id: updates.coverage.applicationId,
        premium: updates.coverage.premium,
        last_review_date: updates.coverage.lastReviewDate,
      })
  }
}
