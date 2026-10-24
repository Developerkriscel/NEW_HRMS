export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { OFFER_VIEW_ROLES, canManageOffers, OFFER_STATUS } from '@/lib/offerConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { PIPELINE_STAGE_CATEGORY } from '@/lib/jobConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { applyStageMove, recordStageHistory } from '@/lib/pipelineHelpers'
import { getActorName } from '@/lib/candidateHelpers'
import Offer from '@/models/Offer'
import Application from '@/models/Application'
import ApplicationStageHistory from '@/models/ApplicationStageHistory'
import JobPipelineStage from '@/models/JobPipelineStage'

const NOT_WITHDRAWABLE = [OFFER_STATUS.ACCEPTED, OFFER_STATUS.DECLINED, OFFER_STATUS.WITHDRAWN]

// POST { reason } — item: "HR may need to withdraw an offer." Requires a
// reason. Deliberately does NOT revoke the public link — the candidate
// portal needs the token to still resolve so it can show "This offer is no
// longer active" (the status check alone, not token revocation, is what
// blocks Accept/Decline/Discuss from here on).
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageOffers(session)) return fail('You do not have permission to withdraw this offer', 403, 'FORBIDDEN')
  if (!body.reason?.trim()) return fail('A withdrawal reason is required', 400, 'VALIDATION_ERROR')

  const offer = await Offer.findOne({ _id: params.id, tenantId, deleted: false })
  if (!offer) throw new ApiError(404, 'Offer not found', 'NOT_FOUND')
  if (NOT_WITHDRAWABLE.includes(offer.status)) return fail(`Cannot withdraw an offer that is already ${offer.status.toLowerCase()}`, 400, 'INVALID_STATE')

  const actorName = await getActorName(session)
  offer.status = OFFER_STATUS.WITHDRAWN
  offer.withdrawnAt = new Date()
  offer.withdrawalReason = body.reason.trim()
  offer.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Offer withdrawn by ${actorName} — ${body.reason.trim()}`, actorName })
  await offer.save()

  const application = await Application.findOne({ _id: offer.applicationId, tenantId, deleted: false })
  let restoredStage = null
  if (application) {
    const recentMoves = await ApplicationStageHistory.find({
      tenantId,
      applicationId: application._id,
      action: STAGE_HISTORY_ACTION.MOVED,
    }).sort({ createdAt: -1 }).limit(2).lean()
    const previousMove = recentMoves.find((item) => String(item.toStageId || '') !== String(application.currentStage || '')) || recentMoves[1]
    const previousStage = previousMove?.toStageId
      ? await JobPipelineStage.findOne({ _id: previousMove.toStageId, tenantId, jobId: application.jobId, isActive: true })
      : null
    if (previousStage && String(application.currentStage) !== String(previousStage._id)) {
      const move = applyStageMove(application, previousStage, { comment: 'Offer withdrawn - returned to previous pipeline stage', actorName })
      restoredStage = previousStage
      await recordStageHistory({
        tenantId,
        application,
        fromStageId: move.fromStageId,
        toStageId: previousStage._id,
        fromStageName: move.fromStageName,
        toStageName: previousStage.name,
        action: STAGE_HISTORY_ACTION.MOVED,
        comment: 'Offer withdrawn - returned to previous pipeline stage',
        session,
      })
    }
    application.readyForOffer = false
    application.selectionStatus = restoredStage?.category === PIPELINE_STAGE_CATEGORY.SELECTED ? 'SELECTED' : null
    application.activityLog.push({
      type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED,
      message: `Offer withdrawn by ${actorName}`,
      comment: body.reason.trim(),
      actorName,
    })
    await application.save()
  }

  await logAction(session, { action: 'OFFER_WITHDRAWN', entityType: 'Offer', entityId: offer._id, description: `Offer withdrawn: ${body.reason}`, req })

  return ok({ offer, stage: restoredStage ? {
    _id: restoredStage._id,
    name: restoredStage.name,
    category: restoredStage.category,
  } : null }, 'Offer withdrawn')
})
