// Same local-disk convention as lib/resumeStorage.js /
// lib/assessmentFileStorage.js — no cloud storage anywhere in this app.
import { mkdir, writeFile, readFile } from 'fs/promises'
import path from 'path'

const STORAGE_ROOT = path.join(process.cwd(), 'output', 'offers')

function sanitizeSegment(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'file'
}

export async function saveOfferPdf(buffer, tenantId, offerCode, version) {
  const filename = `${sanitizeSegment(offerCode)}-v${version}-${Date.now()}.pdf`
  const tenantDir = path.join(STORAGE_ROOT, sanitizeSegment(String(tenantId)))
  await mkdir(tenantDir, { recursive: true })
  await writeFile(path.join(tenantDir, filename), buffer)
  return {
    url: `/api/recruitment/offers/files/${sanitizeSegment(String(tenantId))}/${filename}`,
    filename,
  }
}

export async function readOfferPdf(tenantId, filename) {
  if (!/^[a-zA-Z0-9_-]+\.pdf$/.test(filename)) return null
  try {
    return await readFile(path.join(STORAGE_ROOT, sanitizeSegment(String(tenantId)), filename))
  } catch (err) {
    if (err?.code === 'ENOENT') return null
    throw err
  }
}
