export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_MANAGE_ROLES, ACTIVITY_ENTRY_TYPE, APPLICATION_STATUS } from '@/lib/candidateConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { applyStageMove, findShortlistStage, recordStageHistory } from '@/lib/pipelineHelpers'
import Application from '@/models/Application'
import JobPipelineStage from '@/models/JobPipelineStage'

// POST — HR Screening Decision: Shortlist. Moves the application to the
// job's "Shortlisted" stage (or the next stage in order if the job's
// custom pipeline has no stage literally named that — see
// lib/pipelineHelpers.js#findShortlistStage). The AI match itself never
// does this automatically — a human always clicks the button.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')
  if (application.status !== APPLICATION_STATUS.ACTIVE) return fail('Only an active application can be shortlisted', 400, 'INVALID_STATE')

  const stages = await JobPipelineStage.find({ tenantId, jobId: application.jobId, isActive: true }).lean()
  const target = findShortlistStage(stages, application.currentStage)

  const actorName = await getActorName(session)

  if (target) {
    const { fromStageId, fromStageName } = applyStageMove(application, target, { comment: body.comment, actorName })
    await application.save()
    await recordStageHistory({
      tenantId, application, fromStageId, toStageId: target._id, fromStageName, toStageName: target.name,
      action: STAGE_HISTORY_ACTION.SHORTLISTED, comment: body.comment, session,
    })
  } else {
    application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.UPDATED, message: `Shortlisted by ${actorName}`, comment: body.comment, actorName })
    await application.save()
    await recordStageHistory({
      tenantId, application, fromStageId: application.currentStage, toStageId: application.currentStage,
      fromStageName: application.currentStageName, toStageName: application.currentStageName,
      action: STAGE_HISTORY_ACTION.SHORTLISTED, comment: body.comment, session,
    })
  }

  await logAction(session, { action: 'APPLICATION_SHORTLISTED', entityType: 'Application', entityId: application._id, description: `Shortlisted ${application.applicationCode}`, req })

  return ok(application, 'Candidate shortlisted')
})
