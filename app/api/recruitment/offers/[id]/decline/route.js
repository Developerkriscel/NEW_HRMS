export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, requestIp, requestUserAgent } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { OFFER_STATUS, OFFER_MANAGE_ROLES, OFFER_CANDIDATE_ACTION, OFFER_DECLINE_REASONS, canManageOffers } from '@/lib/offerConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { PIPELINE_STAGE_CATEGORY } from '@/lib/jobConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { applyStageMove, recordStageHistory } from '@/lib/pipelineHelpers'
import Offer from '@/models/Offer'
import Application from '@/models/Application'
import OfferCandidateAction from '@/models/OfferCandidateAction'
import ApplicationStageHistory from '@/models/ApplicationStageHistory'
import JobPipelineStage from '@/models/JobPipelineStage'

const DECLINABLE = [OFFER_STATUS.SENT, OFFER_STATUS.VIEWED]

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageOffers(session)) return fail('You do not have permission to decline this offer', 403, 'FORBIDDEN')

  const reason = OFFER_DECLINE_REASONS.includes(body.reason) ? body.reason : 'Other'
  const offer = await Offer.findOne({ _id: params.id, tenantId, deleted: false })
  if (!offer) return fail('Offer not found', 404, 'NOT_FOUND')
  if (!DECLINABLE.includes(offer.status)) {
    return fail(`This offer cannot be declined (currently ${offer.status.toLowerCase()})`, 400, 'INVALID_STATE')
  }

  const actorName = await getActorName(session)
  offer.status = OFFER_STATUS.DECLINED
  offer.declinedAt = new Date()
  offer.declineReason = reason
  offer.declineComment = body.comment || null
  offer.activityLog.push({
    type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED,
    message: `Offer marked declined by ${actorName} — ${reason}`,
    comment: body.comment || null,
    actorName,
  })
  await offer.save()

  await OfferCandidateAction.create({
    tenantId,
    offerId: offer._id,
    action: OFFER_CANDIDATE_ACTION.DECLINE,
    reason,
    comment: body.comment || 'Marked declined by HR',
    ipAddress: requestIp(req),
    userAgent: requestUserAgent(req),
  })

  const application = await Application.findOne({ _id: offer.applicationId, tenantId, deleted: false })
  let restoredStage = null
  if (application) {
    const actorName = await getActorName(session)
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
      const move = applyStageMove(application, previousStage, { comment: 'Offer declined - returned to previous pipeline stage', actorName })
      restoredStage = previousStage
      await recordStageHistory({
        tenantId,
        application,
        fromStageId: move.fromStageId,
        toStageId: previousStage._id,
        fromStageName: move.fromStageName,
        toStageName: previousStage.name,
        action: STAGE_HISTORY_ACTION.MOVED,
        comment: 'Offer declined - returned to previous pipeline stage',
        session,
      })
    }
    application.readyForOffer = false
    application.selectionStatus = restoredStage?.category === PIPELINE_STAGE_CATEGORY.SELECTED ? 'SELECTED' : null
    application.activityLog.push({
      type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED,
      message: `Offer declined — ${reason}`,
      comment: body.comment || null,
      actorName,
    })
    await application.save()
  }

  await logAction(session, {
    action: 'OFFER_DECLINED_BY_HR',
    entityType: 'Offer',
    entityId: offer._id,
    description: `Offer ${offer.offerCode} marked declined by HR: ${reason}`,
    req,
  })

  return ok({ offer, stage: restoredStage ? {
    _id: restoredStage._id,
    name: restoredStage.name,
    category: restoredStage.category,
  } : null }, 'Offer declined')
})
