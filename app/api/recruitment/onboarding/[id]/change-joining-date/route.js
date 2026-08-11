export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { PREBOARDING_VIEW_ROLES, canManagePreboarding } from '@/lib/preboardingConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Preboarding from '@/models/Preboarding'

// POST { joiningDate } — table action "Change Joining Date". Writes
// confirmedJoiningDate — proposedJoiningDate (snapshotted from the offer at
// acceptance) is left untouched as the original record.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManagePreboarding(session)) return fail('You do not have permission to change the joining date', 403, 'FORBIDDEN')
  if (!body.joiningDate) return fail('A joining date is required', 400, 'VALIDATION_ERROR')

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')

  const actorName = await getActorName(session)
  const newDate = new Date(body.joiningDate)
  preboarding.confirmedJoiningDate = newDate
  preboarding.activityLog.push({ type: 'UPDATED', message: `Joining date changed to ${newDate.toDateString()} by ${actorName}`, actorName })
  await preboarding.save()

  await logAction(session, { action: 'PREBOARDING_JOINING_DATE_CHANGED', entityType: 'Preboarding', entityId: preboarding._id, description: `Joining date changed to ${newDate.toISOString()}`, req })

  return ok(preboarding, 'Joining date updated')
})
