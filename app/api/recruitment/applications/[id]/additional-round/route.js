export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { SELECTION_MANAGE_ROLES, canManageSelections, SELECTION_DECISION_TYPE, SELECTION_STATUS, ADDITIONAL_ROUND_INTERVIEW_TYPES } from '@/lib/selectionConstants'
import { APPLICATION_STATUS } from '@/lib/candidateConstants'
import { PIPELINE_STAGE_CATEGORY } from '@/lib/jobConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { applyStageMove, recordStageHistory } from '@/lib/pipelineHelpers'
import Application from '@/models/Application'
import JobPipelineStage from '@/models/JobPipelineStage'
import SelectionDecision from '@/models/SelectionDecision'

// POST { reason, interviewType, comments? } — sends the candidate back to
// an interview-category stage instead of deciding now. Picks the job's
// *last* INTERVIEW-category stage (closest to Selected) so "one more round"
// reads naturally rather than restarting the whole interview loop.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, SELECTION_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageSelections(session)) return fail('You do not have permission to send a candidate to an additional round', 403, 'FORBIDDEN')
  if (!body.reason?.trim()) return fail('A reason is required', 400, 'VALIDATION_ERROR')
  if (!body.interviewType || !ADDITIONAL_ROUND_INTERVIEW_TYPES.includes(body.interviewType)) return fail('A valid interview type is required', 400, 'VALIDATION_ERROR')

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')
  if ([APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.WITHDRAWN, APPLICATION_STATUS.HIRED].includes(application.status)) {
    return fail(`Cannot move a ${application.status.toLowerCase()} application`, 400, 'INVALID_STATE')
  }

  const stages = await JobPipelineStage.find({ tenantId, jobId: application.jobId, isActive: true, category: PIPELINE_STAGE_CATEGORY.INTERVIEW }).sort({ order: -1 })
  const targetStage = stages[0]
  if (!targetStage) return fail("This job's pipeline has no interview stage to send the candidate back to", 400, 'VALIDATION_ERROR')

  const actorName = await getActorName(session)
  const wasOnHold = application.status === APPLICATION_STATUS.ON_HOLD
  if (wasOnHold) application.status = APPLICATION_STATUS.ACTIVE

  const { fromStageId, fromStageName } = applyStageMove(application, targetStage, { comment: body.comments, actorName })
  application.selectionStatus = SELECTION_STATUS.ADDITIONAL_ROUND
  await application.save()

  await recordStageHistory({
    tenantId, application, fromStageId, toStageId: targetStage._id, fromStageName, toStageName: targetStage.name,
    action: STAGE_HISTORY_ACTION.MOVED, comment: `Additional round (${body.interviewType}) — ${body.reason}`, session,
  })

  const decision = await SelectionDecision.create({
    tenantId,
    applicationId: application._id, candidateId: application.candidateId, jobId: application.jobId,
    decision: SELECTION_DECISION_TYPE.ADDITIONAL_ROUND,
    interviewType: body.interviewType,
    decisionReason: body.reason.trim(),
    comments: body.comments || null,
    decidedBy: session.userId, decidedByName: actorName, decidedAt: new Date(),
  })

  await logAction(session, {
    action: 'CANDIDATE_ADDITIONAL_ROUND', entityType: 'Application', entityId: application._id,
    description: `${application.applicationCode} sent to an additional ${body.interviewType} round: ${body.reason}`, req,
  })

  return ok({ application, decision }, 'Candidate sent to an additional round')
})
