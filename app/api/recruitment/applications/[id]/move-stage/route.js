export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_VIEW_ROLES, canManageCandidates, APPLICATION_STATUS } from '@/lib/candidateConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { applyStageMove, recordStageHistory } from '@/lib/pipelineHelpers'
import Application from '@/models/Application'
import JobPipelineStage from '@/models/JobPipelineStage'

// POST { stageId, comment? } — the Kanban drag/drop *and* the Move Stage
// modal both call this one route; the frontend drag is only a UI gesture,
// every move is re-validated here (stage must belong to the application's
// own job and be active) before anything is written.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageCandidates(session)) return fail('You do not have permission to move applications', 403, 'FORBIDDEN')
  if (!body.stageId) return fail('stageId is required', 400, 'VALIDATION_ERROR')

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')
  if ([APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.WITHDRAWN, APPLICATION_STATUS.HIRED].includes(application.status)) {
    return fail(`Cannot move a ${application.status.toLowerCase()} application`, 400, 'INVALID_STATE')
  }

  const stage = await JobPipelineStage.findOne({ _id: body.stageId, tenantId, jobId: application.jobId, isActive: true })
  if (!stage) return fail('That stage does not belong to this job', 400, 'VALIDATION_ERROR')

  const actorName = await getActorName(session)
  const wasOnHold = application.status === APPLICATION_STATUS.ON_HOLD
  if (wasOnHold) application.status = APPLICATION_STATUS.ACTIVE // moving stage implicitly resumes a held application

  const { fromStageId, fromStageName } = applyStageMove(application, stage, { comment: body.comment, actorName })
  if (wasOnHold) application.activityLog.push({ type: 'STATUS_CHANGED', message: `Resumed from hold by ${actorName}`, actorName })
  application.updatedBy = session.sub
  await application.save()

  await recordStageHistory({
    tenantId, application, fromStageId, toStageId: stage._id, fromStageName, toStageName: stage.name,
    action: STAGE_HISTORY_ACTION.MOVED, comment: body.comment, session,
  })

  await logAction(session, {
    action: 'APPLICATION_STAGE_CHANGED',
    entityType: 'Application', entityId: application._id,
    description: `Application ${application.applicationCode} moved ${fromStageName} -> ${stage.name}`,
    req,
  })

  return ok(application, 'Stage updated')
})
