export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { OFFER_VIEW_ROLES, canApproveOffer, OFFER_STATUS, OFFER_VERSION_STATUS, OFFER_APPROVAL_STATUS } from '@/lib/offerConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Offer from '@/models/Offer'
import OfferVersion from '@/models/OfferVersion'
import OfferApproval from '@/models/OfferApproval'
import Job from '@/models/Job'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const offer = await Offer.findOne({ _id: params.id, tenantId, deleted: false })
  if (!offer) throw new ApiError(404, 'Offer not found', 'NOT_FOUND')
  const version = await OfferVersion.findOne({ _id: offer.currentVersionId, tenantId })
  if (!version || version.status !== OFFER_VERSION_STATUS.PENDING_APPROVAL) {
    return fail('This offer is not pending approval', 400, 'INVALID_STATE')
  }

  const job = await Job.findOne({ _id: offer.jobId, tenantId, deleted: false })
  if (!canApproveOffer(session, job)) return fail('You do not have permission to approve this offer', 403, 'FORBIDDEN')

  const actorName = await getActorName(session)
  version.status = OFFER_VERSION_STATUS.APPROVED
  version.approvedBy = session.userId
  version.approvedByName = actorName
  version.approvedAt = new Date()
  await version.save()

  offer.status = OFFER_STATUS.APPROVED
  offer.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Offer V${version.version} approved by ${actorName}`, comment: body.comment, actorName })
  await offer.save()

  await OfferApproval.findOneAndUpdate(
    { tenantId, offerVersionId: version._id },
    { status: OFFER_APPROVAL_STATUS.APPROVED, approverId: session.userId, approverName: actorName, comment: body.comment || null, actedAt: new Date() },
    { upsert: true }
  )

  await logAction(session, { action: 'OFFER_APPROVED', entityType: 'Offer', entityId: offer._id, description: `Offer V${version.version} approved`, req })

  return ok({ offer, version }, 'Offer approved')
})
