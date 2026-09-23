import { getAppBaseUrl, sendTenantEmail, textToHtml } from './tenantMail'
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
  if (version?.pdfUrl) return version.pdfUrl
  const tenant = await Tenant.findById(tenantId).select('companyName').lean()
  const buffer = await generateOfferPdfBuffer({
    companyName: tenant?.companyName,
    offerCode: `${offer.offerCode} - V${version.version}`,
    bodyText: version.renderedContent,
  })
  const { url } = await saveOfferPdf(buffer, tenantId, offer.offerCode, version.version)
  version.pdfUrl = url
  await version.save()
  return url
}

export async function sendOfferEmail({ tenantId, candidate, job, version, portalUrl, subject, body, candidateEmail }) {
  const to = candidateEmail || candidate?.email
  const name = candidateName(candidate)
  const jobTitle = job?.publicTitle || job?.jobTitle || 'the offered role'
  const reviewUrl = fullUrl(portalUrl)
  const emailSubject = subject || `Job Offer from NexaHR - ${jobTitle}`
  const emailBody = body || `Dear ${name},

We are pleased to offer you the position of ${jobTitle}.

Please review and respond to your offer here:
${reviewUrl}

Best regards,
The NexaHR Recruitment Team`

  const attachments = await buildOfferMailAttachments(tenantId, version)
  const html = `
    <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.6">
      ${textToHtml(emailBody)}
      <div style="margin:24px 0">
        <a href="${reviewUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:10px;padding:12px 18px;font-weight:700">Review Offer</a>
      </div>
      <p style="font-size:13px;color:#64748b">If the button does not work, open this link: <a href="${reviewUrl}">${reviewUrl}</a></p>
    </div>
  `

  return sendTenantEmail(tenantId, {
    to,
    subject: emailSubject,
    text: `${emailBody}\n\nReview offer: ${reviewUrl}`,
    html,
    attachments,
  })
}
