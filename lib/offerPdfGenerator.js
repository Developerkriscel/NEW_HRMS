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
function cleanText(value) {
  return String(value || '')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2022/g, '-')
}

function normalizeLetterBody(bodyText, companyName, candidateName) {
  let body = String(bodyText || '').replace(/\bNexaHR\b/gi, companyName)
  if (candidateName) {
    body = body.replace(/^\s*Dear\s+[^,\n]+,?/im, `Dear ${candidateName},`)
  }
  return body
}

export function generateOfferPdfBuffer({ companyName, offerCode, bodyText, candidateName }) {
  return new Promise((resolve, reject) => {
    const company = String(companyName || 'Company').trim()
    const body = normalizeLetterBody(bodyText, company, candidateName)
    const doc = new PDFDocument({ margin: 58, size: 'A4', bufferPages: true, info: { Title: `${company} Offer Letter`, Author: company, Subject: 'Offer of Employment' } })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right
    doc.save().rect(0, 0, doc.page.width, 10).fill('#3730a3').restore()
    doc.moveDown(0.7)
    doc.font('Helvetica-Bold').fontSize(20).fillColor('#111827').text(company, { align: 'center' })
    doc.moveDown(0.25)
    doc.font('Helvetica').fontSize(10).fillColor('#4f46e5').text('OFFER OF EMPLOYMENT', { align: 'center', characterSpacing: 1.2 })
    doc.moveDown(0.35)
    doc.fontSize(8.5).fillColor('#64748b').text(offerCode || '', { align: 'center' })
    doc.moveDown(1.1)
    doc.strokeColor('#cbd5e1').lineWidth(0.8).moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.margins.left + pageWidth, doc.y).stroke()
    doc.moveDown(1.1)

    const lines = cleanText(body).split('\n')
    for (const line of lines) {
      if (line.startsWith('## ')) {
        doc.moveDown(0.75)
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#1e293b').text(line.slice(3).trim(), { continued: false })
        doc.moveDown(0.18)
        doc.strokeColor('#e0e7ff').lineWidth(1).moveTo(doc.x, doc.y).lineTo(doc.x + 55, doc.y).stroke()
        doc.moveDown(0.35)
        doc.font('Helvetica').fontSize(10).fillColor('#334155')
      } else if (line.trim() === '') {
        doc.moveDown(0.55)
      } else {
        const trimmed = line.trim()
        const bullet = /^[•*-]\s+/.test(trimmed)
        doc.font('Helvetica').fontSize(10).fillColor('#334155').text(trimmed, {
          align: 'left',
          lineGap: 3,
          indent: bullet ? 12 : 0,
          hanging: bullet ? 12 : 0,
          width: pageWidth,
        })
      }
    }

    const range = doc.bufferedPageRange()
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index)
      doc.save()
        .strokeColor('#e2e8f0').lineWidth(0.6)
        .moveTo(doc.page.margins.left, doc.page.height - 43)
        .lineTo(doc.page.width - doc.page.margins.right, doc.page.height - 43).stroke()
      doc.font('Helvetica').fontSize(8).fillColor('#64748b')
        .text(company, doc.page.margins.left, doc.page.height - 32, { width: pageWidth / 2 })
        .text(`Offer ${offerCode || ''}  |  Page ${index + 1} of ${range.count}`, doc.page.width - doc.page.margins.right - pageWidth / 2, doc.page.height - 32, { width: pageWidth / 2, align: 'right' })
      doc.restore()
    }

    doc.end()
  })
}
