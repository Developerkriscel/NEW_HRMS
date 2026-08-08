export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_VIEW_ROLES, canManageCandidates, ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Application from '@/models/Application'
import JobPipelineStage from '@/models/JobPipelineStage'

// "Move Stage" — moves the application to any active stage of its own
// job's pipeline (see job_pipeline_stages, Step 3). Kept intentionally
// simple for Step 5: a direct jump, not a guided kanban flow.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageCandidates(session)) return fail('You do not have permission to move applications', 403, 'FORBIDDEN')
  if (!body.stageId) return fail('stageId is required', 400, 'VALIDATION_ERROR')

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const stage = await JobPipelineStage.findOne({ _id: body.stageId, tenantId, jobId: application.jobId, isActive: true })
  if (!stage) return fail('That stage does not belong to this job', 400, 'VALIDATION_ERROR')

  const fromStage = application.currentStageName
  application.currentStage = stage._id
  application.currentStageName = stage.name
  application.updatedBy = session.sub

  const actorName = await getActorName(session)
  application.activityLog.push({
    type: ACTIVITY_ENTRY_TYPE.STAGE_CHANGED,
    message: `Moved from ${fromStage} to ${stage.name} by ${actorName}`,
    actorId: session.userId, actorName,
  })
  await application.save()

  await logAction(session, {
    action: 'APPLICATION_STAGE_CHANGED',
    entityType: 'Application', entityId: application._id,
    description: `Application ${application.applicationCode} moved ${fromStage} -> ${stage.name}`,
    req,
  })

  return ok(application, 'Stage updated')
})
