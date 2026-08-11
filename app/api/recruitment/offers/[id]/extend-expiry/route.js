export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { OFFER_VIEW_ROLES, canManageOffers, OFFER_STATUS } from '@/lib/offerConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Offer from '@/models/Offer'

const EXTENDABLE = [OFFER_STATUS.SENT, OFFER_STATUS.VIEWED, OFFER_STATUS.EXPIRED]

// POST { expiresAt } — "After expiry: EXPIRED. Candidate cannot accept
// unless HR extends validity." Extending an already-EXPIRED offer un-expires
// it (back to VIEWED if the candidate had already opened it, else SENT) —
// the existing link keeps working, no need to reissue one.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageOffers(session)) return fail('You do not have permission to extend this offer', 403, 'FORBIDDEN')
  if (!body.expiresAt) return fail('A new expiry date is required', 400, 'VALIDATION_ERROR')

  const offer = await Offer.findOne({ _id: params.id, tenantId, deleted: false })
  if (!offer) throw new ApiError(404, 'Offer not found', 'NOT_FOUND')
  if (!EXTENDABLE.includes(offer.status)) return fail(`Cannot extend an offer that is ${offer.status.toLowerCase()}`, 400, 'INVALID_STATE')

  const newExpiry = new Date(body.expiresAt)
  if (newExpiry <= new Date()) return fail('The new expiry must be in the future', 400, 'VALIDATION_ERROR')

  const actorName = await getActorName(session)
  const wasExpired = offer.status === OFFER_STATUS.EXPIRED
  offer.expiresAt = newExpiry
  if (wasExpired) offer.status = offer.viewedAt ? OFFER_STATUS.VIEWED : OFFER_STATUS.SENT
  offer.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Offer validity extended to ${newExpiry.toDateString()} by ${actorName}`, actorName })
  await offer.save()

  await logAction(session, { action: 'OFFER_EXPIRY_EXTENDED', entityType: 'Offer', entityId: offer._id, description: `Offer expiry extended to ${newExpiry.toISOString()}`, req })

  return ok(offer, 'Offer validity extended')
})
