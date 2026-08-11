export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_MANAGE_ROLES, RESUME_PERMISSIONS, RESUME_PARSING_STATUS } from '@/lib/candidateConstants'
import { runParseAndPersist } from '@/lib/candidateProfileHelpers'
import Candidate from '@/models/Candidate'
import CandidateResume from '@/models/CandidateResume'

// POST — "Retry Parsing" for a resume stuck at FAILED (e.g. a transient
// read error). Re-runs the exact same parser against the exact same file —
// if the failure was UNSUPPORTED_FORMAT or an unreadable scan, this will
// fail again for the same honest reason, and the UI should still offer
// "upload a different resume" as the real fix.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)

  const resume = await CandidateResume.findOne({ _id: params.id, tenantId })
  if (!resume) throw new ApiError(404, 'Resume not found', 'NOT_FOUND')
  if (resume.parsingStatus !== RESUME_PARSING_STATUS.FAILED) {
    return fail('Only a failed resume can be retried', 400, 'INVALID_STATE')
  }

  if (resume.candidateId) {
    const candidate = await Candidate.findOne({ _id: resume.candidateId, tenantId })
    if (candidate) {
      candidate.activityLog.push({ type: 'RESUME_PARSING_STARTED', message: 'Resume parsing retried by HR', actorName: session.sub })
      await candidate.save()
    }
  }

  const updated = await runParseAndPersist(resume._id, tenantId)

  await logAction(session, { action: RESUME_PERMISSIONS.PARSE, entityType: 'CandidateResume', entityId: resume._id, description: 'Retried resume parsing', req })

  return ok(updated)
})
