export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_MANAGE_ROLES, RESUME_PERMISSIONS, RESUME_PARSING_STATUS } from '@/lib/candidateConstants'
import { runParseAndPersist } from '@/lib/candidateProfileHelpers'
import CandidateResume from '@/models/CandidateResume'

// POST — explicitly (re)trigger parsing for a resume still sitting at
// UPLOADED (the normal path already does this in the background on upload;
// this exists for callers/UI states where that didn't happen, e.g. a
// draft resume that was saved without parsing). For a FAILED resume, use
// /retry instead — kept as a separate, explicit action per the spec.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)

  const resume = await CandidateResume.findOne({ _id: params.id, tenantId })
  if (!resume) throw new ApiError(404, 'Resume not found', 'NOT_FOUND')
  if (resume.parsingStatus !== RESUME_PARSING_STATUS.UPLOADED) {
    return fail(`This resume is already ${resume.parsingStatus.toLowerCase()} — use retry if it failed`, 400, 'INVALID_STATE')
  }

  const updated = await runParseAndPersist(resume._id, tenantId)

  await logAction(session, { action: RESUME_PERMISSIONS.PARSE, entityType: 'CandidateResume', entityId: resume._id, description: `Triggered resume parsing`, req })

  return ok(updated)
})
