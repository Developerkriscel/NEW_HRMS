export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_MANAGE_ROLES, APPLICATION_STATUS, CANDIDATE_STATUS, ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { recordStageHistory } from '@/lib/pipelineHelpers'
import Application from '@/models/Application'
import Candidate from '@/models/Candidate'

// POST { comment? } — "Candidate may be unsuitable for this job but
// valuable later." Closes out *this* application (status: REJECTED, same
// as spec: "Application can still remain rejected/closed") while flagging
// the *candidate* record itself as TALENT_POOL — the candidate stays fully
// visible/searchable for future openings, just not still active on this one.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')
  if ([APPLICATION_STATUS.WITHDRAWN, APPLICATION_STATUS.HIRED].includes(application.status)) {
    return fail(`Cannot move a ${application.status.toLowerCase()} application to the talent pool`, 400, 'INVALID_STATE')
  }

  const candidate = await Candidate.findOne({ _id: application.candidateId, tenantId, deleted: false })
  if (!candidate) throw new ApiError(404, 'Candidate not found', 'NOT_FOUND')

  const actorName = await getActorName(session)

  application.status = APPLICATION_STATUS.REJECTED
  application.rejectionReason = application.rejectionReason || 'Position closed'
  application.rejectionComment = body.comment || 'Moved to talent pool for future opportunities'
  application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Moved to Talent Pool by ${actorName}`, comment: body.comment, actorName })
  await application.save()

  candidate.status = CANDIDATE_STATUS.TALENT_POOL
  candidate.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Moved to Talent Pool by ${actorName} (from application ${application.applicationCode})`, comment: body.comment, actorName })
  await candidate.save()

  await recordStageHistory({
    tenantId, application, fromStageId: application.currentStage, toStageId: null,
    fromStageName: application.currentStageName, toStageName: 'Talent Pool',
    action: STAGE_HISTORY_ACTION.TALENT_POOL, comment: body.comment, session,
  })

  await logAction(session, { action: 'CANDIDATE_TALENT_POOL', entityType: 'Candidate', entityId: candidate._id, description: `${candidate.candidateCode} moved to talent pool`, req })

  return ok(application, 'Candidate moved to talent pool')
})
