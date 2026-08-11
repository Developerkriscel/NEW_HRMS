export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { PREBOARDING_VIEW_ROLES, canManagePreboarding, PREBOARDING_STATUS } from '@/lib/preboardingConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Preboarding from '@/models/Preboarding'

const NOT_CANCELLABLE = [PREBOARDING_STATUS.JOINED, PREBOARDING_STATUS.CANCELLED]

// POST { reason } — table action "Cancel Preboarding". Deliberately does
// NOT revoke the candidate's form link, same reasoning as offer withdraw
// (Step 14): the portal needs the token to still resolve so it can show a
// clear "no longer active" message instead of a generic invalid-link error.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManagePreboarding(session)) return fail('You do not have permission to cancel this preboarding', 403, 'FORBIDDEN')
  if (!body.reason?.trim()) return fail('A cancellation reason is required', 400, 'VALIDATION_ERROR')

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')
  if (NOT_CANCELLABLE.includes(preboarding.status)) return fail(`Cannot cancel a preboarding that is already ${preboarding.status.toLowerCase()}`, 400, 'INVALID_STATE')

  const actorName = await getActorName(session)
  preboarding.status = PREBOARDING_STATUS.CANCELLED
  preboarding.cancelledAt = new Date()
  preboarding.cancelReason = body.reason.trim()
  preboarding.activityLog.push({ type: 'STATUS_CHANGED', message: `Preboarding cancelled by ${actorName} — ${body.reason.trim()}`, actorName })
  await preboarding.save()

  await logAction(session, { action: 'PREBOARDING_CANCELLED', entityType: 'Preboarding', entityId: preboarding._id, description: `Preboarding cancelled: ${body.reason}`, req })

  return ok(preboarding, 'Preboarding cancelled')
})
