// Local-disk storage for take-home/file-upload assessment submissions —
// same convention as lib/resumeStorage.js (no cloud object storage
// configured anywhere in this codebase). Files are written directly from
// the *public*, unauthenticated submit route, then served back only
// through an authenticated, tenant-verified streaming route — never under
// public/, since submissions can contain candidate work product.
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

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
  await writeFile(absolutePath, buffer)

  return {
    url: `/api/recruitment/candidate-assessments/files/${sanitizeSegment(String(tenantId))}/${filename}`,
    filename, originalFileName: file.name || null,
  }
}
