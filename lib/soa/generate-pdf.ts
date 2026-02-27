import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import * as fontkit from "fontkit"
import * as fs from "fs"
import * as path from "path"
import type { SOARecord } from "@/lib/db/soa"
import { createServiceRoleClient } from "@/lib/supabase/server"
import { insertSOAAudit } from "@/lib/db/soa"

/**
 * Coordinate mappings for overlaying data onto the CMS SOA template.
 * Template is US Letter (612 x 792 points).
 * pdf-lib uses bottom-left origin (y=0 at bottom of page).
 * All coordinates are in pdf-lib's coordinate system.
 */
const SOA_TEMPLATE_COORDS = {
  /** Product checkboxes: draw ✓ in each selected product's checkbox. Helvetica-Bold, size 14 */
  products: {
    part_d: { x: 60, y: 642 },
    part_c: { x: 60, y: 618 },
    dental_vision_hearing: { x: 60, y: 594 },
    hospital_indemnity: { x: 60, y: 570 },
    medigap: { x: 60, y: 547 },
  },
  /** Beneficiary/Representative section */
  clientSignature: { x: 80, y: 427 },
  clientSignatureDate: { x: 460, y: 427 },
  repName: { x: 28, y: 384 },
  repRelationship: { x: 322, y: 384 },
  /** Agent section */
  agentName: { x: 95, y: 330 },
  agentPhone: { x: 390, y: 330 },
  beneficiaryName: { x: 120, y: 302 },
  beneficiaryPhone: { x: 410, y: 302 },
  beneficiaryAddress: { x: 130, y: 274 },
  initialContactMethod: { x: 28, y: 241 },
  agentSignature: { x: 120, y: 214 },
  dateAppointmentCompleted: { x: 465, y: 184 },
}

const SIGNATURE_COLOR = rgb(0.106, 0.165, 0.29)
const TEXT_COLOR = rgb(0.2, 0.2, 0.2)

const TEMPLATE_PATH = path.join(
  process.cwd(),
  "public",
  "templates",
  "soa-template.pdf"
)

const SIGNATURE_FONT_PATH = path.join(
  process.cwd(),
  "public",
  "fonts",
  "DancingScript-Bold.ttf"
)

function formatDate(iso: string | null): string {
  if (!iso) return ""
  // Date-only (YYYY-MM-DD): format as calendar date to avoid timezone shift
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [, y, m, d] = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? []
    if (y && m && d) return `${m}/${d}/${y}`
  }
  const d = new Date(iso)
  return d.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  })
}

export async function generateSignedSOAPDF(
  soa: SOARecord
): Promise<{ path: string; error?: string }> {
  try {
    if (!fs.existsSync(TEMPLATE_PATH)) {
      return {
        path: "",
        error:
          "SOA template not found at public/templates/soa-template.pdf. Please add the CMS-approved blank template.",
      }
    }

    const templateBytes = fs.readFileSync(TEMPLATE_PATH)
    const pdfDoc = await PDFDocument.load(templateBytes)
    pdfDoc.registerFontkit(fontkit as any)

    if (!fs.existsSync(SIGNATURE_FONT_PATH)) {
      return {
        path: "",
        error:
          "Signature font not found at public/fonts/DancingScript-Bold.ttf. Please add the Dancing Script Bold TTF file.",
      }
    }
    const fontBytes = fs.readFileSync(SIGNATURE_FONT_PATH)
    // subset: true avoids buffer overflow when parsing some glyphs in Dancing Script
const signatureFont = await pdfDoc.embedFont(fontBytes, { subset: true })

    const pages = pdfDoc.getPages()
    if (pages.length === 0) {
      return { path: "", error: "SOA template has no pages" }
    }
    const page = pages[0]

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    // Use "X" — WinAnsi (Helvetica) cannot encode Unicode checkmark (✓)
    const CHECKMARK = "X"

    // Product checkboxes: draw X in each selected product's checkbox
    for (const productId of soa.productsSelected) {
      const pos = SOA_TEMPLATE_COORDS.products[productId as keyof typeof SOA_TEMPLATE_COORDS.products]
      if (pos) {
        page.drawText(CHECKMARK, {
          x: pos.x,
          y: pos.y,
          size: 14,
          font: boldFont,
          color: TEXT_COLOR,
        })
      }
    }

    // Representative info (when signer is representative)
    if (soa.signerType === "representative" && (soa.repName || soa.repRelationship)) {
      page.drawText(soa.repName ?? "—", {
        x: SOA_TEMPLATE_COORDS.repName.x,
        y: SOA_TEMPLATE_COORDS.repName.y,
        size: 10,
        font: regularFont,
        color: TEXT_COLOR,
      })
      page.drawText(soa.repRelationship ?? "—", {
        x: SOA_TEMPLATE_COORDS.repRelationship.x,
        y: SOA_TEMPLATE_COORDS.repRelationship.y,
        size: 10,
        font: regularFont,
        color: TEXT_COLOR,
      })
    }

    // Client signature (cursive) — use "-" fallback; em-dash can break custom font encoding
    page.drawText(soa.clientTypedSignature ?? "-", {
      x: SOA_TEMPLATE_COORDS.clientSignature.x,
      y: SOA_TEMPLATE_COORDS.clientSignature.y,
      size: 22,
      font: signatureFont,
      color: SIGNATURE_COLOR,
    })
    page.drawText(formatDate(soa.clientSignedAt), {
      x: SOA_TEMPLATE_COORDS.clientSignatureDate.x,
      y: SOA_TEMPLATE_COORDS.clientSignatureDate.y,
      size: 10,
      font: regularFont,
      color: TEXT_COLOR,
    })

    // Agent section
    page.drawText(soa.agentName ?? "—", {
      x: SOA_TEMPLATE_COORDS.agentName.x,
      y: SOA_TEMPLATE_COORDS.agentName.y,
      size: 10,
      font: regularFont,
      color: TEXT_COLOR,
    })
    page.drawText(soa.agentPhone ?? "—", {
      x: SOA_TEMPLATE_COORDS.agentPhone.x,
      y: SOA_TEMPLATE_COORDS.agentPhone.y,
      size: 10,
      font: regularFont,
      color: TEXT_COLOR,
    })
    page.drawText(soa.beneficiaryName ?? "—", {
      x: SOA_TEMPLATE_COORDS.beneficiaryName.x,
      y: SOA_TEMPLATE_COORDS.beneficiaryName.y,
      size: 10,
      font: regularFont,
      color: TEXT_COLOR,
    })
    page.drawText(soa.beneficiaryPhone ?? "—", {
      x: SOA_TEMPLATE_COORDS.beneficiaryPhone.x,
      y: SOA_TEMPLATE_COORDS.beneficiaryPhone.y,
      size: 10,
      font: regularFont,
      color: TEXT_COLOR,
    })
    page.drawText(soa.beneficiaryAddress ?? "—", {
      x: SOA_TEMPLATE_COORDS.beneficiaryAddress.x,
      y: SOA_TEMPLATE_COORDS.beneficiaryAddress.y,
      size: 10,
      font: regularFont,
      color: TEXT_COLOR,
    })
    page.drawText(soa.initialContactMethod ?? "—", {
      x: SOA_TEMPLATE_COORDS.initialContactMethod.x,
      y: SOA_TEMPLATE_COORDS.initialContactMethod.y,
      size: 10,
      font: regularFont,
      color: TEXT_COLOR,
    })

    // Agent signature: use agentName so it updates when name is edited; fallback to typed signature
    page.drawText(soa.agentName || soa.agentTypedSignature || "-", {
      x: SOA_TEMPLATE_COORDS.agentSignature.x,
      y: SOA_TEMPLATE_COORDS.agentSignature.y,
      size: 18,
      font: signatureFont,
      color: SIGNATURE_COLOR,
    })
    // Use appointment date (editable) when set, otherwise agent signed date
    const displayDate = soa.appointmentDate ?? soa.agentSignedAt
    page.drawText(formatDate(displayDate), {
      x: SOA_TEMPLATE_COORDS.dateAppointmentCompleted.x,
      y: SOA_TEMPLATE_COORDS.dateAppointmentCompleted.y,
      size: 9,
      font: regularFont,
      color: TEXT_COLOR,
    })

    const pdfBytes = await pdfDoc.save()
    const storagePath = `${soa.agentId}/${soa.id}.pdf`

    const supabase = createServiceRoleClient()
    const bucket = supabase.storage.from("soa-documents")

    // Delete existing PDF so we always serve a fresh file (avoids CDN/cache serving stale content)
    const pathsToRemove = new Set([storagePath])
    if (soa.signedPdfPath) pathsToRemove.add(soa.signedPdfPath)
    await bucket.remove([...pathsToRemove]).catch(() => {})

    const { error: uploadError } = await bucket.upload(storagePath, pdfBytes, {
      upsert: true,
      contentType: "application/pdf",
    })

    if (uploadError) {
      console.error("SOA PDF upload error:", uploadError)
      return { path: "", error: uploadError.message }
    }

    await supabase
      .from("scope_of_appointments")
      .update({
        signed_pdf_path: storagePath,
        updated_at: new Date().toISOString(),
      })
      .eq("id", soa.id)

    await insertSOAAudit(supabase, soa.id, "pdf_generated", "system")

    return { path: storagePath }
  } catch (e) {
    console.error("generateSignedSOAPDF error:", e)
    return {
      path: "",
      error: e instanceof Error ? e.message : "PDF generation failed",
    }
  }
}
