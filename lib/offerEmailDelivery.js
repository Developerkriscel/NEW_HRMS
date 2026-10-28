import { getAppBaseUrl, sendTenantEmail } from './tenantMail'
import { generateOfferPdfBuffer } from './offerPdfGenerator'
import { readOfferPdf } from './offerStorage'
import { saveOfferPdf } from './offerStorage'
import Tenant from '@/models/Tenant'

function candidateName(candidate) {
  if (candidate?.getFullName) return candidate.getFullName()
  return [candidate?.firstName, candidate?.lastName].filter(Boolean).join(' ') || 'Candidate'
}

function filenameFromUrl(url) {
  const value = String(url || '')
  const filename = value.split('/').pop()
  return filename ? decodeURIComponent(filename) : ''
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function fullUrl(pathOrUrl) {
  const value = String(pathOrUrl || '')
  if (!value) return ''
  if (/^https?:\/\//i.test(value)) return value
  return `${getAppBaseUrl()}${value.startsWith('/') ? value : `/${value}`}`
}

async function buildPdfAttachment(tenantId, filename, displayName) {
  if (!filename) return null
  const content = await readOfferPdf(tenantId, filename)
  if (!content) return null
  return {
    filename: displayName || filename,
    content,
    contentType: 'application/pdf',
  }
}

export async function buildOfferMailAttachments(tenantId, version) {
  const attachments = []
  const generatedFilename = filenameFromUrl(version?.pdfUrl)
  const generatedPdf = await buildPdfAttachment(tenantId, generatedFilename, `Offer-Letter-v${version.version || 1}.pdf`)
  if (generatedPdf) attachments.push(generatedPdf)

  for (const item of version?.attachments || []) {
    const attachment = await buildPdfAttachment(tenantId, item.fileName, item.originalFileName || item.fileName)
    if (attachment) attachments.push(attachment)
  }

  return attachments
}

export async function ensureOfferPdf({ tenantId, offer, version }) {
  // The database marker can outlive local storage (deploys, container
  // restarts, or a cleared output directory). Verify the actual PDF before
  // reusing the URL; otherwise the email would be reported as sent without
  // its offer-letter attachment.
  if (version?.pdfUrl && version?.pdfFormatVersion === 2) {
    const existingFilename = filenameFromUrl(version.pdfUrl)
    const existingPdf = await buildPdfAttachment(tenantId, existingFilename, `Offer-Letter-v${version.version || 1}.pdf`)
    if (existingPdf) return version.pdfUrl
  }
  const tenant = await Tenant.findById(tenantId).select('companyName').lean()
  const buffer = await generateOfferPdfBuffer({
    companyName: tenant?.companyName,
    offerCode: `${offer.offerCode} - V${version.version}`,
    bodyText: version.renderedContent,
    candidateName: offer.candidateId?.getFullName
      ? offer.candidateId.getFullName()
      : [offer.candidateId?.firstName, offer.candidateId?.lastName].filter(Boolean).join(' '),
  })
  const { url } = await saveOfferPdf(buffer, tenantId, offer.offerCode, version.version)
  version.pdfUrl = url
  version.pdfFormatVersion = 2
  await version.save()
  return url
}

export async function sendOfferEmail({ tenantId, candidate, job, version, portalUrl, employeeDetailsUrl, subject, body, candidateEmail }) {
  const to = candidateEmail || candidate?.email
  const name = candidateName(candidate)
  const tenant = await Tenant.findById(tenantId).select('companyName').lean()
  const companyName = String(tenant?.companyName || '').trim() || 'the company'
  const jobTitle = job?.publicTitle || job?.jobTitle || 'the offered role'
  const reviewUrl = fullUrl(portalUrl)
  const detailsUrl = fullUrl(employeeDetailsUrl)
  const replaceDefaultBrand = (value) => String(value || '').replace(/\b(?:NexaHR|the company)\b/gi, companyName)
  const emailSubject = replaceDefaultBrand(subject || `Job Offer from ${companyName} - ${jobTitle}`)
  const offerText = replaceDefaultBrand(body || `Dear ${name},

We are pleased to offer you the position of ${jobTitle}. Please review the attached offer letter and respond using the secure link below.

Best regards,
The ${companyName} Recruitment Team`)
  const detailsText = detailsUrl
    ? `After accepting the offer, complete your employee details here: ${detailsUrl}`
    : ''
  const emailBody = [offerText, detailsText].filter(Boolean).join('\n\n')

  const attachments = await buildOfferMailAttachments(tenantId, version)
  if (!attachments.some((attachment) => attachment?.contentType === 'application/pdf' && attachment?.content)) {
    const error = new Error('Offer PDF could not be attached. Generate the offer document again and retry sending.')
    error.status = 500
    error.errorCode = 'OFFER_PDF_ATTACHMENT_MISSING'
    throw error
  }
  const html = `
    <div style="max-width:640px;margin:0 auto;padding:24px;font-family:Arial,sans-serif;color:#0f172a;line-height:1.6;border:1px solid #e2e8f0;border-radius:16px">
      <p style="margin:0 0 16px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#475569">${escapeHtml(companyName)} · Offer Letter</p>
      <div style="font-size:15px;white-space:pre-line">${escapeHtml(offerText)}</div>
      <div style="margin:22px 0 12px">
        <a href="${escapeHtml(reviewUrl)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:9px;padding:12px 18px;font-weight:700">Review and respond to offer</a>
      </div>
      ${detailsUrl ? `<p style="margin:12px 0 0;font-size:14px;color:#475569">After accepting, <a href="${escapeHtml(detailsUrl)}" style="color:#0f766e;font-weight:700">complete your employee details</a> using this secure form.</p>` : ''}
      <p style="margin:18px 0 0;font-size:12px;color:#64748b">The offer letter is attached as a PDF.</p>
    </div>
  `

  return sendTenantEmail(tenantId, {
    to,
    subject: emailSubject,
    text: `${emailBody}\n\nReview and respond to offer: ${reviewUrl}`,
    html,
    attachments,
    fromName: companyName,
  })
}
