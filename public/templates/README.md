# SOA Template

## soa-template.pdf (required)

Upload the **blank CMS-approved Scope of Appointment** PDF template here. The PDF generator overlays beneficiary info, agent info, product selections, and signatures onto this template.

- File must be named: `soa-template.pdf`
- The template must contain all required CMS disclosure language, section headers, and formatting
- Only the variable data (names, dates, signatures, product checkmarks) is drawn by the application

## Calibrating coordinates

After uploading your template, you may need to adjust the overlay positions in `lib/soa/generate-pdf.ts`. The `SOA_TEMPLATE_COORDS` object defines x,y positions for each field. Use a PDF measurement tool to find the correct coordinates (Y is measured from the top of the page; the code converts to pdf-lib's bottom-origin system).
