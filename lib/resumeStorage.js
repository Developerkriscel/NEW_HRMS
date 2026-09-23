// Private resume storage. Local disk remains the fallback for development;
// set STORAGE_DRIVER=r2 to store files permanently in Cloudflare R2.
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { RESUME_MAX_SIZE_BYTES, RESUME_ALLOWED_EXTENSIONS, RESUME_ALLOWED_MIME_TYPES } from './candidateConstants'
import { getPrivateObjectBuffer, isR2StorageEnabled, putPrivateObject, storageKey } from './objectStorage'

const STORAGE_ROOT = path.join(process.cwd(), 'output', 'resumes')

function sanitizeSegment(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'file'
}

export function validateResumeFile(file) {
  if (!file || typeof file === 'string') return 'Resume file is required'
  if (file.size > RESUME_MAX_SIZE_BYTES) return `Resume must be under ${RESUME_MAX_SIZE_BYTES / (1024 * 1024)}MB`

  const ext = (file.name?.split('.').pop() || '').toLowerCase()
  const mimeOk = RESUME_ALLOWED_MIME_TYPES.includes(file.type)
  const extOk = RESUME_ALLOWED_EXTENSIONS.includes(ext)
  // Browsers don't always send a reliable `type` for .doc — accept if
  // either the MIME type or the extension checks out, not both.
  if (!mimeOk && !extOk) return 'Resume must be a PDF, DOC or DOCX file'
  return null
}

// Returns the URL to store on Candidate.resumeUrl (an authenticated API
// path, not a static file path) and the absolute disk path actually written.
export async function saveResumeFile(file, tenantId, candidateCode) {
  const ext = (file.name?.split('.').pop() || 'pdf').toLowerCase()
  const filename = `${sanitizeSegment(candidateCode)}-${Date.now()}.${sanitizeSegment(ext)}`
  const tenantDir = path.join(STORAGE_ROOT, sanitizeSegment(String(tenantId)))
  await mkdir(tenantDir, { recursive: true })

  const absolutePath = path.join(tenantDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  if (isR2StorageEnabled()) {
    await putPrivateObject(storageKey('tenants', tenantId, 'resumes', filename), buffer, {
      contentType: file.type || 'application/octet-stream',
      metadata: { originalFileName: file.name || filename },
    })
  }
  // Keep a local copy as a parser/workspace cache; the canonical copy is R2
  // when STORAGE_DRIVER=r2.
  await writeFile(absolutePath, buffer)

  return {
    url: `/api/recruitment/resumes/${sanitizeSegment(String(tenantId))}/${filename}`,
    absolutePath,
    filename,
  }
}

export async function readResumeFile(tenantId, filename) {
  if (!/^[a-zA-Z0-9_-]+\.(pdf|doc|docx)$/.test(filename)) return null
  if (isR2StorageEnabled()) {
    const buffer = await getPrivateObjectBuffer(storageKey('tenants', tenantId, 'resumes', filename))
    if (buffer) return buffer
  }
  try {
    return await readFile(path.join(STORAGE_ROOT, sanitizeSegment(String(tenantId)), filename))
  } catch (err) {
    if (err?.code === 'ENOENT') return null
    throw err
  }
}

export async function getResumeLocalPath(tenantId, filename) {
  const tenantDir = path.join(STORAGE_ROOT, sanitizeSegment(String(tenantId)))
  const absolutePath = path.join(tenantDir, filename)

  try {
    await readFile(absolutePath)
    return absolutePath
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err
  }

  const buffer = await readResumeFile(tenantId, filename)
  if (!buffer) return absolutePath

  await mkdir(tenantDir, { recursive: true })
  await writeFile(absolutePath, buffer)
  return absolutePath
}
