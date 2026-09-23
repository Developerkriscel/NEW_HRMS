export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { APPLICATION_STATUS, CANDIDATE_MANAGE_ROLES, ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { PIPELINE_STAGE_CATEGORY } from '@/lib/jobConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { SELECTION_STATUS } from '@/lib/selectionConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { syncPipelineStages } from '@/lib/jobHelpers'
import { recordStageHistory } from '@/lib/pipelineHelpers'
import Application from '@/models/Application'
import Job from '@/models/Job'
import JobPipelineStage from '@/models/JobPipelineStage'

function pickRestoreStage(stages, application, body = {}) {
  const active = (stages || []).filter((stage) => stage.isActive !== false)
  if (!active.length) return null

  const wantedName = String(body.stageName || application.currentStageName || '').trim().toLowerCase()
  const currentId = String(application.currentStage || '')

  return active.find((stage) => body.stageId && String(stage._id) === String(body.stageId))
    || active.find((stage) => currentId && String(stage._id) === currentId)
    || active.find((stage) => wantedName && String(stage.name || '').toLowerCase() === wantedName)
    || active.find((stage) => wantedName && String(stage.name || '').toLowerCase().includes(wantedName))
    || active.find((stage) => stage.category === PIPELINE_STAGE_CATEGORY.APPLIED)
    || active[0]
}

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  if (application.status !== APPLICATION_STATUS.REJECTED) {
    if (application.status === APPLICATION_STATUS.ACTIVE) {
      return ok({ application, stage: null }, 'Candidate is already in pipeline')
    }
    return fail(`Cannot restore a ${application.status.toLowerCase()} application`, 400, 'INVALID_STATE')
  }

  let stages = await JobPipelineStage.find({ tenantId, jobId: application.jobId, isActive: true }).sort({ order: 1 })
  if (!stages.length) {
    const job = await Job.findOne({ _id: application.jobId, tenantId }).select('pipelineTemplate').lean()
    await syncPipelineStages(tenantId, application.jobId, null, job?.pipelineTemplate || 'DEFAULT_HIRING')
    stages = await JobPipelineStage.find({ tenantId, jobId: application.jobId, isActive: true }).sort({ order: 1 })
  }

  const stage = pickRestoreStage(stages, application, body)
  if (!stage) return fail('No active pipeline stage found for this job', 400, 'VALIDATION_ERROR')

  const actorName = await getActorName(session)
  const previousStageId = application.currentStage
  const previousStageName = application.currentStageName || stage.name

  application.status = APPLICATION_STATUS.ACTIVE
  application.currentStage = stage._id
  application.currentStageName = stage.name
  application.stageEnteredAt = new Date()
  application.rejectionReason = null
  application.rejectionComment = null

  if (stage.category === PIPELINE_STAGE_CATEGORY.SELECTED) {
    application.selectionStatus = application.selectionStatus || SELECTION_STATUS.PENDING_DECISION
  } else {
    application.selectionStatus = null
    application.readyForOffer = false
  }

  application.activityLog.push({
    type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED,
    message: `Restored to pipeline at ${stage.name} by ${actorName}`,
    comment: body.comment || null,
    actorName,
  })
  application.updatedBy = session.sub
  await application.save()

  await recordStageHistory({
    tenantId,
    application,
    fromStageId: previousStageId || null,
    toStageId: stage._id,
    fromStageName: 'Rejected',
    toStageName: stage.name,
    action: STAGE_HISTORY_ACTION.RESUMED,
    comment: body.comment || `Restored from rejected status; previous stage was ${previousStageName}`,
    session,
  })

  await logAction(session, {
    action: 'APPLICATION_RESTORED',
    entityType: 'Application',
    entityId: application._id,
    description: `Application ${application.applicationCode} restored to ${stage.name}`,
    req,
  })

  return ok({ application, stage: { _id: stage._id, name: stage.name, category: stage.category } }, 'Candidate restored to pipeline')
})
