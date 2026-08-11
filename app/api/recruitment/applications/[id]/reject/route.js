export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_MANAGE_ROLES, CANDIDATE_STATUS, APPLICATION_STATUS, ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { REJECTION_REASON_LIST } from '@/lib/matchingConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { SELECTION_DECISION_TYPE } from '@/lib/selectionConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { recordStageHistory } from '@/lib/pipelineHelpers'
import Application from '@/models/Application'
import Candidate from '@/models/Candidate'
import SelectionDecision from '@/models/SelectionDecision'

// POST { reason, comment?, addToTalentPool? } — reject is available from
// almost any stage (item 9). Rejection reason is mandatory; "Other"
// additionally requires a comment. Never deletes the candidate or the
// application — this only sets status: REJECTED, the stage the application
// reached stays on record. Item 11's optional "Add to Talent Pool?" reuses
// the exact same candidate-side flip the dedicated /talent-pool route does.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!body.reason || !REJECTION_REASON_LIST.includes(body.reason)) return fail('A valid rejection reason is required', 400, 'VALIDATION_ERROR')
  if (body.reason === 'Other' && !body.comment?.trim()) return fail('A comment is required when the reason is "Other"', 400, 'VALIDATION_ERROR')

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')
  if ([APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.WITHDRAWN, APPLICATION_STATUS.HIRED].includes(application.status)) {
    return fail(`Application is already ${application.status.toLowerCase()}`, 400, 'INVALID_STATE')
  }

  const actorName = await getActorName(session)
  application.status = APPLICATION_STATUS.REJECTED
  application.rejectionReason = body.reason
  application.rejectionComment = body.comment || null
  application.activityLog.push({
    type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED,
    message: `Rejected by ${actorName}`,
    comment: `Reason: ${body.reason}${body.comment ? ` — ${body.comment}` : ''}`,
    actorName,
  })
  await application.save()

  await recordStageHistory({
    tenantId, application, fromStageId: application.currentStage, toStageId: null,
    fromStageName: application.currentStageName, toStageName: 'Rejected',
    action: STAGE_HISTORY_ACTION.REJECTED, comment: `${body.reason}${body.comment ? ` — ${body.comment}` : ''}`, session,
  })

  if (body.addToTalentPool) {
    const candidate = await Candidate.findOne({ _id: application.candidateId, tenantId, deleted: false })
    if (candidate) {
      candidate.status = CANDIDATE_STATUS.TALENT_POOL
      candidate.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Added to Talent Pool by ${actorName} (from rejected application ${application.applicationCode})`, actorName })
      await candidate.save()
    }
  }

  await SelectionDecision.create({
    tenantId,
    applicationId: application._id, candidateId: application.candidateId, jobId: application.jobId,
    decision: SELECTION_DECISION_TYPE.REJECT,
    decisionReason: body.reason,
    comments: body.comment || null,
    addToTalentPool: !!body.addToTalentPool,
    decidedBy: session.userId, decidedByName: actorName, decidedAt: new Date(),
  })

  await logAction(session, { action: 'APPLICATION_REJECTED', entityType: 'Application', entityId: application._id, description: `${application.applicationCode} rejected: ${body.reason}`, reason: body.reason, req })

  return ok(application, 'Candidate rejected')
})
