export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { CANDIDATE_VIEW_ROLES } from '@/lib/candidateConstants'
import { buildParsedDataReview } from '@/lib/candidateProfileHelpers'
import Candidate from '@/models/Candidate'
import CandidateResume from '@/models/CandidateResume'

// GET — the "Resume Data Review" comparison: Candidate Entered vs Resume
// Extracted, per field, with confidence + which fields/sections HR has
// already applied.
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const resume = await CandidateResume.findOne({ _id: params.id, tenantId })
  if (!resume) throw new ApiError(404, 'Resume not found', 'NOT_FOUND')

  const candidate = resume.candidateId ? await Candidate.findOne({ _id: resume.candidateId, tenantId, deleted: false }) : null
  const review = await buildParsedDataReview(resume, candidate)

  return ok(review)
})
