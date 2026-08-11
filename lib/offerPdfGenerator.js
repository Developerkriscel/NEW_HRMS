// Step 13 item 12 — "Generate final offer PDF only from approved version."
// No PDF-generation library existed anywhere in this codebase before this
// step; pdfkit was added specifically for this (pure JS, no native
// bindings, so it can't reintroduce the kind of platform-binary mismatch
// this app has already hit once with @next/swc).
import PDFDocument from 'pdfkit'

// `bodyText` is OfferVersion.renderedContent — plain text with a simple
// convention: a line starting with "## " is a section heading (see the
// seeded templates in lib/offerTemplateSeeds.js), a blank line is a
// paragraph break, everything else is body copy. Deliberately not
// HTML-to-PDF (no such renderer in this stack) — this is a plain,
// readable formatted letter, not a pixel-perfect reproduction of the
// on-screen preview.
export function generateOfferPdfBuffer({ companyName, offerCode, bodyText }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 56, size: 'A4' })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.font('Helvetica-Bold').fontSize(16).text(companyName || 'Company', { align: 'center' })
    doc.moveDown(0.3)
    doc.font('Helvetica').fontSize(10).fillColor('#666666').text('OFFER OF EMPLOYMENT', { align: 'center' })
    doc.fillColor('#000000')
    doc.moveDown(0.2)
    doc.fontSize(8).fillColor('#999999').text(offerCode || '', { align: 'center' })
    doc.fillColor('#000000')
    doc.moveDown(1.5)

    const lines = String(bodyText || '').split('\n')
    for (const line of lines) {
      if (line.startsWith('## ')) {
        doc.moveDown(0.6)
        doc.font('Helvetica-Bold').fontSize(11).text(line.slice(3))
        doc.font('Helvetica').fontSize(10)
      } else if (line.trim() === '') {
        doc.moveDown(0.4)
      } else {
        doc.fontSize(10).text(line, { align: 'left', lineGap: 2 })
      }
    }

    doc.end()
  })
}
