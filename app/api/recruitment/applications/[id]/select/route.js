export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { SELECTION_MANAGE_ROLES, canManageSelections, SELECTION_DECISION_TYPE, SELECTION_STATUS, SELECTION_APPROVAL_LEVEL, APPROVAL_STATUS } from '@/lib/selectionConstants'
import { APPLICATION_STATUS, ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { getRecruitmentSettings, computeVacancyStatus } from '@/lib/selectionHelpers'
import { PIPELINE_STAGE_CATEGORY } from '@/lib/jobConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { applyStageMove, recordStageHistory } from '@/lib/pipelineHelpers'
import Application from '@/models/Application'
import Job from '@/models/Job'
import JobPipelineStage from '@/models/JobPipelineStage'
import SelectionDecision from '@/models/SelectionDecision'
import Interview from '@/models/Interview'

function pickSelectedStage(stages) {
  const active = (stages || []).filter((stage) => stage.isActive !== false)
  return active.find((stage) => String(stage.name || '').toLowerCase() === 'selected')
    || active.find((stage) => String(stage.name || '').toLowerCase().includes('selected'))
    || active.find((stage) => stage.category === PIPELINE_STAGE_CATEGORY.SELECTED)
    || null
}

// Selection remains a validated backend decision; the optional stage move lets
// the recruitment board complete "Select & Offer" in one API call.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, SELECTION_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageSelections(session)) return fail('You do not have permission to record a selection decision', 403, 'FORBIDDEN')
  if (!body.proposedJoiningDate) return fail('A recommended joining date is required', 400, 'VALIDATION_ERROR')

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')
  if ([APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.WITHDRAWN, APPLICATION_STATUS.HIRED].includes(application.status)) {
    return fail(`Cannot select a ${application.status.toLowerCase()} application`, 400, 'INVALID_STATE')
  }
  const scheduledInterview = await Interview.findOne({
    tenantId,
    applicationId: application._id,
    deleted: false,
    status: { $nin: ['CANCELLED', 'NO_SHOW'] },
    date: { $ne: null },
  }).select('_id').lean()
  if (!scheduledInterview) {
    return fail('Schedule an interview before selecting this candidate.', 400, 'INTERVIEW_REQUIRED')
  }

  const job = await Job.findOne({ _id: application.jobId, tenantId, deleted: false })
  const [vacancy, settings, actorName] = await Promise.all([
    job ? computeVacancyStatus(job, tenantId, { excludeApplicationId: application._id }) : null,
    getRecruitmentSettings(tenantId),
    getActorName(session),
  ])
  const approvalLevel = settings.selectionApprovalLevel
  const needsApproval = approvalLevel !== SELECTION_APPROVAL_LEVEL.NONE

  let movedStage = null
  let fromStageId = null
  let fromStageName = null
  if (body.moveToSelectedStage !== false) {
    const stages = await JobPipelineStage.find({ tenantId, jobId: application.jobId, isActive: true }).sort({ order: 1 })
    const selectedStage = pickSelectedStage(stages)
    if (selectedStage && String(application.currentStage) !== String(selectedStage._id)) {
      const move = applyStageMove(application, selectedStage, { comment: body.comments || 'Selected from recruitment board', actorName })
      fromStageId = move.fromStageId
      fromStageName = move.fromStageName
      movedStage = selectedStage
    }
  }

  application.selectionStatus = needsApproval ? SELECTION_STATUS.SELECTION_APPROVAL_PENDING : SELECTION_STATUS.SELECTED
  application.activityLog.push({
    type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED,
    message: `Selected by ${actorName}${needsApproval ? ' - awaiting approval' : ''}`,
    comment: body.comments,
    actorName,
  })
  await application.save()

  if (movedStage) {
    await recordStageHistory({
      tenantId,
      application,
      fromStageId,
      toStageId: movedStage._id,
      fromStageName,
      toStageName: movedStage.name,
      action: STAGE_HISTORY_ACTION.MOVED,
      comment: body.comments || 'Selected from recruitment board',
      session,
    })
  }

  const decision = await SelectionDecision.create({
    tenantId,
    applicationId: application._id, candidateId: application.candidateId, jobId: application.jobId,
    decision: SELECTION_DECISION_TYPE.SELECT,
    recommendedDesignationId: body.recommendedDesignationId || null,
    recommendedDepartmentId: body.recommendedDepartmentId || null,
    recommendedManagerId: body.recommendedManagerId || null,
    proposedJoiningDate: new Date(body.proposedJoiningDate),
    employmentType: body.employmentType || null,
    comments: body.comments || null,
    decidedBy: session.userId, decidedByName: actorName, decidedAt: new Date(),
    approvalStatus: needsApproval ? APPROVAL_STATUS.PENDING : APPROVAL_STATUS.NOT_REQUIRED,
    approvalLevel: needsApproval ? approvalLevel : null,
  })

  await logAction(session, {
    action: 'CANDIDATE_SELECTED', entityType: 'Application', entityId: application._id,
    description: `${application.applicationCode} marked Selected${needsApproval ? ' (pending approval)' : ''}`, req,
  })

  return ok({
    application,
    decision,
    vacancy,
    stage: movedStage ? { _id: movedStage._id, name: movedStage.name, category: movedStage.category } : null,
  }, needsApproval ? 'Selection recorded - pending approval' : 'Candidate selected')
})
