// Private onboarding document storage. Local disk is the development
// fallback; set STORAGE_DRIVER=r2 to use Cloudflare R2. "Files must be
// stored privately... never expose raw storage bucket
// URLs publicly" (item 9, Step 16). `storageKey` returned here is an
// internal path only ever resolved by an authenticated HR route or a
// token-gated candidate route — never handed to the browser directly.
import { mkdir, writeFile, readFile } from 'fs/promises'
import path from 'path'
import { DOCUMENT_ALLOWED_FILE_TYPES, DOCUMENT_MAX_FILE_SIZE_BYTES } from './preboardingConstants'
import { getPrivateObjectBuffer, isR2StorageEnabled, putPrivateObject, storageKey as buildObjectKey } from './objectStorage'

const STORAGE_ROOT = path.join(process.cwd(), 'output', 'preboarding-documents')

function sanitizeSegment(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'file'
}

export function validateDocumentFile(file, allowedTypes = DOCUMENT_ALLOWED_FILE_TYPES, maxSize = DOCUMENT_MAX_FILE_SIZE_BYTES) {
  if (!file) return 'A file is required'
  const ext = (file.name?.split('.').pop() || '').toLowerCase()
  if (!allowedTypes.includes(ext)) return `File type .${ext} is not allowed for this document. Allowed: ${allowedTypes.join(', ')}`
  if (file.size > maxSize) return `File is too large — maximum ${Math.round(maxSize / 1024 / 1024)}MB`
  return null
}

export async function saveDocumentFile(file, tenantId, candidateDocumentId, version) {
  const ext = (file.name?.split('.').pop() || 'pdf').toLowerCase()
  const filename = `${sanitizeSegment(String(candidateDocumentId))}-v${version}-${Date.now()}.${sanitizeSegment(ext)}`
  const tenantDir = path.join(STORAGE_ROOT, sanitizeSegment(String(tenantId)))
  await mkdir(tenantDir, { recursive: true })

  const buffer = Buffer.from(await file.arrayBuffer())
  if (isR2StorageEnabled()) {
    await putPrivateObject(buildObjectKey('tenants', tenantId, 'preboarding-documents', filename), buffer, {
      contentType: file.type || 'application/octet-stream',
      metadata: { originalFileName: file.name || filename },
    })
  }
  await writeFile(path.join(tenantDir, filename), buffer)

  return { storageKey: filename, fileName: file.name, mimeType: file.type || 'application/octet-stream', size: file.size }
}

export async function readDocumentFile(tenantId, storageKey) {
  if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(storageKey)) return null
  if (isR2StorageEnabled()) {
    const buffer = await getPrivateObjectBuffer(buildObjectKey('tenants', tenantId, 'preboarding-documents', storageKey))
    if (buffer) return buffer
  }
  try {
    return await readFile(path.join(STORAGE_ROOT, sanitizeSegment(String(tenantId)), storageKey))
  } catch (err) {
    if (err?.code === 'ENOENT') return null
    throw err
  }
}
