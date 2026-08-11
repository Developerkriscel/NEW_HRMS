export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { withApi } from '@/lib/handler'
import { fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { PREBOARDING_VIEW_ROLES, canViewSensitivePreboardingData } from '@/lib/preboardingConstants'
import { readDocumentFile } from '@/lib/preboardingDocumentStorage'
import CandidateDocumentVersion from '@/models/CandidateDocumentVersion'
import CandidateDocument from '@/models/CandidateDocument'

const CONTENT_TYPES = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }

// GET /api/recruitment/onboarding/documents/files/{tenantId}/{storageKey} —
// "[Preview]", authenticated. Re-derives the parent CandidateDocument's
// category to apply the same sensitive-data gate as the verify/reject
// routes — a manager can't bypass it just by guessing a file path.
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const segments = params.path || []
  if (segments.length !== 2 || segments[0] !== tenantId) return fail('Not found', 404, 'NOT_FOUND')
  const storageKey = segments[1]

  const version = await CandidateDocumentVersion.findOne({ tenantId, storageKey })
  if (!version) return fail('Document not found', 404, 'NOT_FOUND')
  const doc = await CandidateDocument.findOne({ tenantId, _id: version.candidateDocumentId })
  if (doc && ['Identity', 'Bank', 'Statutory'].includes(doc.category) && !canViewSensitivePreboardingData(session)) {
    return fail('You do not have permission to view this document', 403, 'FORBIDDEN')
  }

  const buffer = await readDocumentFile(tenantId, storageKey)
  if (!buffer) return fail('Document not found', 404, 'NOT_FOUND')

  const ext = storageKey.split('.').pop()
  return new NextResponse(buffer, {
    headers: { 'Content-Type': CONTENT_TYPES[ext] || 'application/octet-stream', 'Content-Disposition': `inline; filename="${version.fileName}"` },
  })
})
