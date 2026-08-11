export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_MANAGE_ROLES } from '@/lib/candidateConstants'
import Candidate from '@/models/Candidate'
import CandidateResume from '@/models/CandidateResume'

// POST — "Keep Separate" on the Possible Duplicate Candidate banner. Only
// dismisses the flag; it never merges records — actual merge logic is
// explicitly out of scope for this step ("Candidate merge logic can be
// enhanced later").
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)

  const resume = await CandidateResume.findOne({ _id: params.id, tenantId })
  if (!resume) throw new ApiError(404, 'Resume not found', 'NOT_FOUND')

  resume.duplicateDismissed = true
  await resume.save()

  if (resume.candidateId) {
    const candidate = await Candidate.findOne({ _id: resume.candidateId, tenantId })
    if (candidate) {
      candidate.activityLog.push({ type: 'UPDATED', message: 'Possible duplicate candidate flag dismissed by HR — kept as separate candidates', actorName: session.sub })
      await candidate.save()
    }
  }

  await logAction(session, { action: 'DUPLICATE_DISMISSED', entityType: 'CandidateResume', entityId: resume._id, description: 'Dismissed possible-duplicate flag', req })

  return ok(resume)
})
