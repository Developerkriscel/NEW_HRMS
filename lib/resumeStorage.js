// Local-disk resume storage — this codebase has no cloud object storage
// configured anywhere (no S3/blob credentials in .env.example), so files
// land under output/resumes/, the same convention the app already uses for
// other generated files (see output/pdf/). Served back only through the
// authenticated app/api/recruitment/resumes/[...path]/route.js — never
// placed under public/, since resumes are candidate PII.
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'
import { RESUME_MAX_SIZE_BYTES, RESUME_ALLOWED_EXTENSIONS, RESUME_ALLOWED_MIME_TYPES } from './candidateConstants'

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
  await writeFile(absolutePath, buffer)

  return {
    url: `/api/recruitment/resumes/${sanitizeSegment(String(tenantId))}/${filename}`,
    absolutePath,
    filename,
  }
}
