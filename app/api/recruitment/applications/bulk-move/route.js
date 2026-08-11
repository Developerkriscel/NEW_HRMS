export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_MANAGE_ROLES, APPLICATION_STATUS } from '@/lib/candidateConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { applyStageMove, recordStageHistory } from '@/lib/pipelineHelpers'
import Application from '@/models/Application'
import JobPipelineStage from '@/models/JobPipelineStage'

// POST { applicationIds, stageId, comment? } — bulk "Move Stage". Every
// application must belong to the *same job* as the target stage (a stage
// document is job-specific) — anything that doesn't is skipped and
// reported back rather than silently failing the whole batch.
export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const applicationIds = Array.isArray(body.applicationIds) ? body.applicationIds : []
  if (!applicationIds.length) return fail('No applications selected', 400, 'VALIDATION_ERROR')
  if (!body.stageId) return fail('stageId is required', 400, 'VALIDATION_ERROR')

  const stage = await JobPipelineStage.findOne({ _id: body.stageId, tenantId, isActive: true })
  if (!stage) return fail('Stage not found', 404, 'NOT_FOUND')

  const applications = await Application.find({ _id: { $in: applicationIds }, tenantId, deleted: false })
  const actorName = await getActorName(session)

  let moved = 0
  const skipped = []
  for (const application of applications) {
    if (String(application.jobId) !== String(stage.jobId)) { skipped.push({ id: application._id, reason: 'Different job' }); continue }
    if ([APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.WITHDRAWN, APPLICATION_STATUS.HIRED].includes(application.status)) {
      skipped.push({ id: application._id, reason: `Application is ${application.status.toLowerCase()}` }); continue
    }
    const wasOnHold = application.status === APPLICATION_STATUS.ON_HOLD
    if (wasOnHold) application.status = APPLICATION_STATUS.ACTIVE
    const { fromStageId, fromStageName } = applyStageMove(application, stage, { comment: body.comment, actorName })
    await application.save()
    await recordStageHistory({
      tenantId, application, fromStageId, toStageId: stage._id, fromStageName, toStageName: stage.name,
      action: STAGE_HISTORY_ACTION.MOVED, comment: body.comment, session,
    })
    moved++
  }

  await logAction(session, { action: 'APPLICATIONS_BULK_MOVED', entityType: 'JobPipelineStage', entityId: stage._id, description: `Bulk-moved ${moved} application(s) to ${stage.name}`, req })

  return ok({ moved, skipped }, `Moved ${moved} application(s)`)
})
