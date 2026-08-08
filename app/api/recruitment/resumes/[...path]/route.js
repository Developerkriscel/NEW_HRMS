export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import { withApi } from '@/lib/handler'
import { fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { CANDIDATE_VIEW_ROLES } from '@/lib/candidateConstants'

const STORAGE_ROOT = path.join(process.cwd(), 'output', 'resumes')
const CONTENT_TYPES = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }

// Authenticated only — resumes are candidate PII and were deliberately
// never placed under public/. The first path segment is the owning
// tenant's id; a request is rejected unless it matches the caller's own
// tenant, regardless of role.
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const segments = params.path || []
  if (segments.length !== 2 || segments[0] !== tenantId) return fail('Not found', 404, 'NOT_FOUND')

  const filename = segments[1]
  if (!/^[a-zA-Z0-9_-]+\.(pdf|doc|docx)$/.test(filename)) return fail('Not found', 404, 'NOT_FOUND')

  const absolutePath = path.join(STORAGE_ROOT, tenantId, filename)
  let buffer
  try {
    buffer = await readFile(absolutePath)
  } catch (err) {
    if (err?.code === 'ENOENT') return fail('Resume not found', 404, 'NOT_FOUND')
    throw err
  }

  const ext = filename.split('.').pop()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  })
})
