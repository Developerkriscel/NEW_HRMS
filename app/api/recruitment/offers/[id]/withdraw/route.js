export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { OFFER_VIEW_ROLES, canManageOffers, OFFER_STATUS } from '@/lib/offerConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Offer from '@/models/Offer'

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

  await logAction(session, { action: 'OFFER_WITHDRAWN', entityType: 'Offer', entityId: offer._id, description: `Offer withdrawn: ${body.reason}`, req })

  return ok(offer, 'Offer withdrawn')
})
