// Private take-home/file-upload assessment storage. Local disk is the
// development fallback; set STORAGE_DRIVER=r2 to use Cloudflare R2.
import { mkdir, readFile, writeFile } from 'fs/promises'
import path from 'path'
import { getPrivateObjectBuffer, isR2StorageEnabled, putPrivateObject, storageKey } from './objectStorage'

const STORAGE_ROOT = path.join(process.cwd(), 'output', 'assessment-submissions')
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB — generous for take-home file submissions

function sanitizeSegment(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'file'
}

export function validateSubmissionFile(file) {
  if (!file || typeof file === 'string') return 'A file is required'
  if (file.size > MAX_SIZE_BYTES) return `File must be under ${MAX_SIZE_BYTES / (1024 * 1024)}MB`
  return null
}

export async function saveSubmissionFile(file, tenantId, candidateAssessmentId, questionId) {
  const ext = (file.name?.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  const filename = `${sanitizeSegment(candidateAssessmentId)}-${sanitizeSegment(questionId)}-${Date.now()}.${ext}`
  const tenantDir = path.join(STORAGE_ROOT, sanitizeSegment(String(tenantId)))
  await mkdir(tenantDir, { recursive: true })

  const absolutePath = path.join(tenantDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  if (isR2StorageEnabled()) {
    await putPrivateObject(storageKey('tenants', tenantId, 'assessment-submissions', filename), buffer, {
      contentType: file.type || 'application/octet-stream',
      metadata: { originalFileName: file.name || filename },
    })
  }
  await writeFile(absolutePath, buffer)

  return {
    url: `/api/recruitment/candidate-assessments/files/${sanitizeSegment(String(tenantId))}/${filename}`,
    filename, originalFileName: file.name || null,
  }
}

export async function readSubmissionFile(tenantId, filename) {
  if (!/^[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(filename)) return null
  if (isR2StorageEnabled()) {
    const buffer = await getPrivateObjectBuffer(storageKey('tenants', tenantId, 'assessment-submissions', filename))
    if (buffer) return buffer
  }
  try {
    return await readFile(path.join(STORAGE_ROOT, sanitizeSegment(String(tenantId)), filename))
  } catch (err) {
    if (err?.code === 'ENOENT') return null
    throw err
  }
}
