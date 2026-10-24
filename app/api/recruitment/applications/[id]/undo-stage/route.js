export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { CANDIDATE_MANAGE_ROLES, APPLICATION_STATUS } from '@/lib/candidateConstants'
import { PIPELINE_STAGE_CATEGORY } from '@/lib/jobConstants'
import { SELECTION_STATUS, APPROVAL_STATUS } from '@/lib/selectionConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { applyStageMove, recordStageHistory } from '@/lib/pipelineHelpers'
import Application from '@/models/Application'
import ApplicationStageHistory from '@/models/ApplicationStageHistory'
import JobPipelineStage from '@/models/JobPipelineStage'
import Offer from '@/models/Offer'
import SelectionDecision from '@/models/SelectionDecision'
import Interview from '@/models/Interview'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')
  if ([APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.WITHDRAWN].includes(application.status)) {
    return fail(`Cannot undo a ${application.status.toLowerCase()} application`, 400, 'INVALID_STATE')
  }

  // Historical applications remain undoable even if their old stage was archived.
  let currentStage = await JobPipelineStage.findOne({ _id: application.currentStage, tenantId, jobId: application.jobId }).lean()
  // Older applications may have a stage name but no stage reference. Resolve
  // that legacy shape before looking up history or calculating the fallback.
  if (!currentStage && application.currentStageName) {
    currentStage = await JobPipelineStage.findOne({
      tenantId,
      jobId: application.jobId,
      name: application.currentStageName,
    }).lean()
  }
  let currentStageId = currentStage?._id || application.currentStage || null
  let currentCategory = String(currentStage?.category || '').toUpperCase()
  const currentName = String(application.currentStageName || '')
  if (application.status === APPLICATION_STATUS.HIRED || currentCategory === PIPELINE_STAGE_CATEGORY.HIRED || /hired|joined/i.test(currentName)) {
    return fail('Hired candidates cannot be undone. Use the onboarding or hiring reversal workflow.', 400, 'INVALID_STATE')
  }
  // A scheduled interview is the real workflow state even when an older
  // application record still says Screening/Shortlisted. Treat that stale
  // state as Interview for undo, then cancel the slot so the candidate does
  // not remain visible in both stages after the response.
  const activeInterview = await Interview.findOne({
    tenantId,
    applicationId: application._id,
    deleted: false,
    status: { $ne: 'CANCELLED' },
  }).sort({ date: -1, startTime: -1 }).lean()
  if (activeInterview && [PIPELINE_STAGE_CATEGORY.APPLIED, PIPELINE_STAGE_CATEGORY.SCREENING, ''].includes(currentCategory)) {
    const interviewStage = activeInterview.pipelineStageId
      ? await JobPipelineStage.findOne({ _id: activeInterview.pipelineStageId, tenantId, jobId: application.jobId, isActive: true }).lean()
      : await JobPipelineStage.findOne({ tenantId, jobId: application.jobId, category: PIPELINE_STAGE_CATEGORY.INTERVIEW, isActive: true }).sort({ order: 1 }).lean()
    if (interviewStage) {
      currentStage = interviewStage
      currentStageId = interviewStage._id
      currentCategory = String(interviewStage.category || '').toUpperCase()
    }
  }
  if (currentCategory === PIPELINE_STAGE_CATEGORY.APPLIED || (!activeInterview && /applied/i.test(currentName))) {
    return fail('Applied is the first pipeline stage and has no previous stage.', 400, 'NO_PREVIOUS_STAGE')
  }

  const activeOffer = await Offer.findOne({
    tenantId,
    applicationId: application._id,
    deleted: false,
    status: { $in: ['SENT', 'VIEWED', 'ACCEPTED'] },
  }).select('status').lean()
  const actorName = await getActorName(session)
  if (activeOffer?.status === 'ACCEPTED') return fail('Accepted offers cannot be undone. Use the hiring reversal workflow.', 400, 'OFFER_ACTIVE')

  const previousHistory = await ApplicationStageHistory.findOne({
    tenantId,
    applicationId: application._id,
    action: { $in: [STAGE_HISTORY_ACTION.MOVED, STAGE_HISTORY_ACTION.SHORTLISTED] },
    fromStageId: { $ne: null },
    toStageId: currentStageId,
  }).sort({ createdAt: -1 }).lean()

  let previousStage = previousHistory?.fromStageId
    ? await JobPipelineStage.findOne({ _id: previousHistory.fromStageId, tenantId, jobId: application.jobId, isActive: true })
    : null

  // Recruitment workflow rule: undoing an interview returns the candidate to
  // the shortlist/screening stage, never directly to Applied. Prefer this
  // semantic target even when older records have incomplete stage history.
  if (currentCategory === PIPELINE_STAGE_CATEGORY.INTERVIEW) {
    const interviewStages = await JobPipelineStage.find({ tenantId, jobId: application.jobId, isActive: true }).sort({ order: 1 }).lean()
    const currentOrder = currentStage?.order ?? Number.MAX_SAFE_INTEGER
    const shortlistStages = interviewStages.filter((stage) => (
      stage.order < currentOrder
      && (stage.category === PIPELINE_STAGE_CATEGORY.SCREENING || /shortlist|screen/i.test(String(stage.name || '')))
    ))
    const semanticPreviousStage = shortlistStages[shortlistStages.length - 1]
    if (semanticPreviousStage) previousStage = semanticPreviousStage
  }

  if (!previousStage) {
    const stages = await JobPipelineStage.find({ tenantId, jobId: application.jobId }).sort({ order: 1 }).lean()
    let currentIndex = stages.findIndex((stage) => String(stage._id) === String(currentStageId))
    if (currentIndex < 0 && application.currentStageName) {
      const wantedName = String(application.currentStageName).trim().toLowerCase()
      currentIndex = stages.findIndex((stage) => String(stage.name || '').trim().toLowerCase() === wantedName)
    }
    previousStage = currentIndex > 0
      ? [...stages.slice(0, currentIndex)].reverse().find((stage) => stage.isActive !== false)
      : null
  }
  if (!previousStage || previousStage.category === PIPELINE_STAGE_CATEGORY.HIRED) {
    return fail('No valid previous pipeline stage is available for this candidate.', 400, 'NO_PREVIOUS_STAGE')
  }

  if (activeOffer && ['SENT', 'VIEWED'].includes(activeOffer.status)) {
    await Offer.updateOne(
      { tenantId, applicationId: application._id, deleted: false, status: { $in: ['SENT', 'VIEWED'] } },
      {
        $set: { status: 'WITHDRAWN', withdrawnAt: new Date(), withdrawalReason: 'Pipeline stage undo' },
        $push: { activityLog: { type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Offer withdrawn during pipeline undo by ${actorName}`, actorName } },
      }
    )
  }
  if (activeInterview) {
    await Interview.updateMany(
      { tenantId, applicationId: application._id, deleted: false, status: { $ne: 'CANCELLED' } },
      { $set: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: 'Other' } }
    )
  }
  const { fromStageId, fromStageName } = applyStageMove(application, previousStage, {
    comment: 'Selection undone; returned to previous stage',
    actorName,
  })
  application.status = APPLICATION_STATUS.ACTIVE
  application.selectionStatus = null
  application.readyForOffer = false
  application.activityLog.push({
    type: 'STATUS_CHANGED',
    message: `Selection undone by ${actorName}; returned to ${previousStage.name}`,
    actorName,
  })
  application.updatedBy = session.userId
  await application.save()

  // Keep the decision as an audit record, but remove a withdrawn selection
  // from approval queues so it cannot be approved after the undo.
  await SelectionDecision.findOneAndUpdate(
    { tenantId, applicationId: application._id, decision: 'SELECT', approvalStatus: APPROVAL_STATUS.PENDING },
    { $set: { approvalStatus: APPROVAL_STATUS.CANCELLED, approvalComment: `Selection withdrawn by ${actorName}`, approvedBy: session.userId, approvedByName: actorName, approvedAt: new Date() } },
    { sort: { decidedAt: -1 } }
  )

  await recordStageHistory({
    tenantId,
    application,
    fromStageId,
    toStageId: previousStage._id,
    fromStageName,
    toStageName: previousStage.name,
    action: STAGE_HISTORY_ACTION.MOVED,
    comment: 'Selection undone; returned to previous stage',
    session,
  })

  return ok({
    application,
    stage: { _id: previousStage._id, name: previousStage.name, category: previousStage.category },
  }, `Candidate returned to ${previousStage.name}`)
})
