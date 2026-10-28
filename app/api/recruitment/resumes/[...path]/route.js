export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { withApi } from '@/lib/handler'
import { fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { CANDIDATE_VIEW_ROLES } from '@/lib/candidateConstants'
import { readResumeFile } from '@/lib/resumeStorage'
import CandidateResume from '@/models/CandidateResume'

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
  if (segments.length !== 2) return fail('Not found', 404, 'NOT_FOUND')

  const filename = segments[1]
  if (!/^[a-zA-Z0-9_-]+\.(pdf|doc|docx)$/.test(filename)) return fail('Not found', 404, 'NOT_FOUND')

  // The URL is stored with the tenant key at upload time. During tenant
  // migrations an older URL can contain a stale key, so authorize the file
  // by the current tenant's CandidateResume record before reading it.
  const resumeRecord = await CandidateResume.findOne({ tenantId, fileName: filename }).select('fileUrl').lean()
  if (segments[0] !== tenantId && !resumeRecord) return fail('Not found', 404, 'NOT_FOUND')
  // Read using the tenant key recorded at upload time. This matters when an
  // R2 object was uploaded before a tenant-id migration and the URL now has
  // the new key.
  const storedTenantId = resumeRecord?.fileUrl?.match(/\/api\/recruitment\/resumes\/([^/]+)\//)?.[1] || tenantId

  const buffer = await readResumeFile(storedTenantId, filename)
  if (!buffer) return fail('Resume not found', 404, 'NOT_FOUND')

  const ext = filename.split('.').pop()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  })
})
