export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import path from 'path'
import { readFile } from 'fs/promises'
import { withApi } from '@/lib/handler'
import { fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { ASSESSMENT_VIEW_ROLES } from '@/lib/assessmentConstants'

const STORAGE_ROOT = path.join(process.cwd(), 'output', 'assessment-submissions')

// Authenticated only — take-home submissions are candidate work product,
// same treatment as resumes (see app/api/recruitment/resumes/[...path]).
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ASSESSMENT_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const segments = params.path || []
  if (segments.length !== 2 || segments[0] !== tenantId) return fail('Not found', 404, 'NOT_FOUND')

  const filename = segments[1]
  if (!/^[a-zA-Z0-9_-]+\.[a-z0-9]+$/.test(filename)) return fail('Not found', 404, 'NOT_FOUND')

  const absolutePath = path.join(STORAGE_ROOT, tenantId, filename)
  let buffer
  try {
    buffer = await readFile(absolutePath)
  } catch (err) {
    if (err?.code === 'ENOENT') return fail('File not found', 404, 'NOT_FOUND')
    throw err
  }

  return new NextResponse(buffer, {
    headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `inline; filename="${filename}"` },
  })
})
