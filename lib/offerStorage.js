// Private offer PDF storage. Local disk is the development fallback; set
// STORAGE_DRIVER=r2 to use Cloudflare R2.
import { mkdir, writeFile, readFile } from 'fs/promises'
import path from 'path'
import { getPrivateObjectBuffer, isR2StorageEnabled, putPrivateObject, storageKey } from './objectStorage'

const STORAGE_ROOT = path.join(process.cwd(), 'output', 'offers')

function sanitizeSegment(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'file'
}

export async function saveOfferPdf(buffer, tenantId, offerCode, version) {
  const filename = `${sanitizeSegment(offerCode)}-v${version}-${Date.now()}.pdf`
  const tenantDir = path.join(STORAGE_ROOT, sanitizeSegment(String(tenantId)))
  await mkdir(tenantDir, { recursive: true })
  if (isR2StorageEnabled()) {
    await putPrivateObject(storageKey('tenants', tenantId, 'offers', filename), buffer, {
      contentType: 'application/pdf',
      metadata: { offerCode, version },
    })
  }
  await writeFile(path.join(tenantDir, filename), buffer)
  return {
    url: `/api/recruitment/offers/files/${sanitizeSegment(String(tenantId))}/${filename}`,
    filename,
  }
}

export function validateOfferAttachment(file) {
  if (!file || typeof file === 'string') return 'Attachment file is required'
  if (file.size > 10 * 1024 * 1024) return 'Offer attachment must be under 10MB'

  const ext = (file.name?.split('.').pop() || '').toLowerCase()
  const mimeOk = file.type === 'application/pdf'
  if (ext !== 'pdf' && !mimeOk) return 'Only PDF attachments are allowed with offer letters'
  return null
}

export async function saveOfferAttachment(file, tenantId, offerCode) {
  const originalName = file.name || 'document.pdf'
  const baseName = originalName.replace(/\.[^.]+$/, '')
  const filename = `${sanitizeSegment(offerCode)}-attachment-${Date.now()}-${sanitizeSegment(baseName)}.pdf`
  const tenantDir = path.join(STORAGE_ROOT, sanitizeSegment(String(tenantId)))
  await mkdir(tenantDir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  if (isR2StorageEnabled()) {
    await putPrivateObject(storageKey('tenants', tenantId, 'offers', filename), buffer, {
      contentType: file.type || 'application/pdf',
      metadata: { offerCode, originalFileName: file.name || filename, attachment: 'true' },
    })
  }
  await writeFile(path.join(tenantDir, filename), buffer)

  return {
    fileName: filename,
    originalFileName: originalName,
    url: `/api/recruitment/offers/files/${sanitizeSegment(String(tenantId))}/${filename}`,
    contentType: file.type || 'application/pdf',
    size: file.size || buffer.length,
    uploadedAt: new Date(),
  }
}

export async function readOfferPdf(tenantId, filename) {
  if (!/^[a-zA-Z0-9_-]+\.pdf$/.test(filename)) return null
  if (isR2StorageEnabled()) {
    const buffer = await getPrivateObjectBuffer(storageKey('tenants', tenantId, 'offers', filename))
    if (buffer) return buffer
  }
  try {
    return await readFile(path.join(STORAGE_ROOT, sanitizeSegment(String(tenantId)), filename))
  } catch (err) {
    if (err?.code === 'ENOENT') return null
    throw err
  }
}
