export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_MANAGE_ROLES, APPLICATION_STATUS, ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { SELECTION_DECISION_TYPE } from '@/lib/selectionConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { recordStageHistory } from '@/lib/pipelineHelpers'
import Application from '@/models/Application'
import SelectionDecision from '@/models/SelectionDecision'

// POST { holdUntil? (aka reviewDate), reason, comment? } — a pause, not a
// stage move; the application's currentStage is left exactly where it was
// so it resumes there later. Item 11's Hold Until / Reason / Comment reuses
// this exact route (its own modal enforces a fixed reason list + mandatory
// review date; this route stays permissive so the pipeline board's plainer
// Hold dialog keeps working unchanged). Also logs a selection_decisions row
// so a hold placed from the Selection Decision page shows up in that
// candidate's decision history.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!body.reason?.trim()) return fail('A reason is required to place a candidate on hold', 400, 'VALIDATION_ERROR')

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')
  if ([APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.WITHDRAWN, APPLICATION_STATUS.HIRED].includes(application.status)) {
    return fail(`Cannot place a ${application.status.toLowerCase()} application on hold`, 400, 'INVALID_STATE')
  }

  const actorName = await getActorName(session)
  application.status = APPLICATION_STATUS.ON_HOLD
  application.holdUntil = body.holdUntil || null
  application.holdReason = body.reason.trim()
  application.holdComment = body.comment || null
  application.activityLog.push({
    type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED,
    message: `On Hold by ${actorName} — ${body.reason.trim()}${body.holdUntil ? ` (until ${new Date(body.holdUntil).toDateString()})` : ''}`,
    comment: body.comment,
    actorName,
  })
  await application.save()

  await recordStageHistory({
    tenantId, application, fromStageId: application.currentStage, toStageId: application.currentStage,
    fromStageName: application.currentStageName, toStageName: application.currentStageName,
    action: STAGE_HISTORY_ACTION.HELD, comment: body.reason.trim(), session,
  })

  await SelectionDecision.create({
    tenantId,
    applicationId: application._id, candidateId: application.candidateId, jobId: application.jobId,
    decision: SELECTION_DECISION_TYPE.HOLD,
    reviewDate: body.reviewDate ? new Date(body.reviewDate) : (body.holdUntil ? new Date(body.holdUntil) : null),
    decisionReason: body.reason.trim(),
    comments: body.comment || null,
    decidedBy: session.userId, decidedByName: actorName, decidedAt: new Date(),
  })

  await logAction(session, { action: 'APPLICATION_HELD', entityType: 'Application', entityId: application._id, description: `${application.applicationCode} put on hold: ${body.reason}`, req })

  return ok(application, 'Candidate placed on hold')
})
