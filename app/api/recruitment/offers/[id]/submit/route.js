export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { OFFER_VIEW_ROLES, canManageOffers, OFFER_STATUS, OFFER_VERSION_STATUS, OFFER_APPROVAL_STATUS } from '@/lib/offerConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Offer from '@/models/Offer'
import OfferVersion from '@/models/OfferVersion'
import OfferApproval from '@/models/OfferApproval'

// POST — DRAFT/REVISION_REQUESTED -> PENDING_APPROVAL. Single-level
// internal approval (item 7's "HR Creates -> PENDING_APPROVAL -> Company
// Admin / Authorized Approver -> APPROVED").
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  if (!canManageOffers(session)) return fail('You do not have permission to submit this offer', 403, 'FORBIDDEN')

  const offer = await Offer.findOne({ _id: params.id, tenantId, deleted: false })
  if (!offer) throw new ApiError(404, 'Offer not found', 'NOT_FOUND')
  const version = await OfferVersion.findOne({ _id: offer.currentVersionId, tenantId })
  if (!version) throw new ApiError(404, 'Offer version not found', 'NOT_FOUND')
  if (![OFFER_VERSION_STATUS.DRAFT, OFFER_VERSION_STATUS.REVISION_REQUESTED].includes(version.status)) {
    return fail(`Cannot submit an offer that is ${version.status.toLowerCase().replace('_', ' ')}`, 400, 'INVALID_STATE')
  }
  if (!version.joiningDate || !version.ctc || !version.offerValidUntil) {
    return fail('Joining date, CTC and offer expiry are required before submitting', 400, 'VALIDATION_ERROR')
  }

  const actorName = await getActorName(session)
  version.status = OFFER_VERSION_STATUS.PENDING_APPROVAL
  version.submittedAt = new Date()
  await version.save()

  offer.status = OFFER_STATUS.PENDING_APPROVAL
  offer.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Offer V${version.version} submitted for approval by ${actorName}`, actorName })
  await offer.save()

  await OfferApproval.create({ tenantId, offerVersionId: version._id, status: OFFER_APPROVAL_STATUS.PENDING })

  await logAction(session, { action: 'OFFER_SUBMITTED', entityType: 'Offer', entityId: offer._id, description: `Offer V${version.version} submitted for approval`, req })

  return ok({ offer, version }, 'Offer submitted for approval')
})
