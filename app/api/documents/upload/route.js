export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import { mkdir, writeFile } from 'fs/promises'
import path from 'path'

const STORAGE_ROOT = path.join(process.cwd(), 'output', 'documents')

function sanitizeSegment(value) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || 'file'
}

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)

  const formData = await req.formData()
  const file = formData.get('document')

  if (!file || typeof file === 'string') {
    return fail('Document file is required', 400)
  }

  const ext = (file.name?.split('.').pop() || 'pdf').toLowerCase()
  const filename = `${sanitizeSegment(session.userId)}-${Date.now()}.${sanitizeSegment(ext)}`
  const tenantDir = path.join(STORAGE_ROOT, sanitizeSegment(String(tenantId)))
  
  await mkdir(tenantDir, { recursive: true })
  const absolutePath = path.join(tenantDir, filename)
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(absolutePath, buffer)

  const url = `/api/documents/view/${sanitizeSegment(String(tenantId))}/${filename}`

  return ok({ url, originalName: file.name }, 'File uploaded successfully', 201)
})
