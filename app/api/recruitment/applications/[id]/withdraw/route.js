export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_MANAGE_ROLES, APPLICATION_STATUS, ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { WITHDRAWAL_REASON_LIST } from '@/lib/matchingConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { recordStageHistory } from '@/lib/pipelineHelpers'
import Application from '@/models/Application'

// POST { reason, comment? } — candidate-initiated withdrawal, tracked
// separately from an HR-initiated Reject (item 10: "HR should not mark
// this as normal rejection").
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!body.reason || !WITHDRAWAL_REASON_LIST.includes(body.reason)) return fail('A valid withdrawal reason is required', 400, 'VALIDATION_ERROR')
  if (body.reason === 'Other' && !body.comment?.trim()) return fail('A comment is required when the reason is "Other"', 400, 'VALIDATION_ERROR')

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')
  if ([APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.WITHDRAWN, APPLICATION_STATUS.HIRED].includes(application.status)) {
    return fail(`Application is already ${application.status.toLowerCase()}`, 400, 'INVALID_STATE')
  }

  const actorName = await getActorName(session)
  application.status = APPLICATION_STATUS.WITHDRAWN
  application.withdrawalReason = body.reason
  application.withdrawalComment = body.comment || null
  application.activityLog.push({
    type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED,
    message: `Marked as Withdrawn by ${actorName}`,
    comment: `Reason: ${body.reason}${body.comment ? ` — ${body.comment}` : ''}`,
    actorName,
  })
  await application.save()

  await recordStageHistory({
    tenantId, application, fromStageId: application.currentStage, toStageId: null,
    fromStageName: application.currentStageName, toStageName: 'Withdrawn',
    action: STAGE_HISTORY_ACTION.WITHDRAWN, comment: `${body.reason}${body.comment ? ` — ${body.comment}` : ''}`, session,
  })

  await logAction(session, { action: 'APPLICATION_WITHDRAWN', entityType: 'Application', entityId: application._id, description: `${application.applicationCode} withdrawn: ${body.reason}`, req })

  return ok(application, 'Application marked as withdrawn')
})
