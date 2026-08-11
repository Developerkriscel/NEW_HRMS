export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { PREBOARDING_VIEW_ROLES, canManagePreboarding, PREBOARDING_STATUS } from '@/lib/preboardingConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Preboarding from '@/models/Preboarding'
import { syncReadinessStatus } from '@/lib/candidateEmployeeConversionService'

// POST — "Joined" tab. Deliberately just a status flag: "Employee creation
// comes later" (this step's scope ends at "Ready to Join").
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  if (!canManagePreboarding(session)) return fail('You do not have permission to mark this candidate as joined', 403, 'FORBIDDEN')

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')
  if (preboarding.status !== PREBOARDING_STATUS.READY_TO_JOIN) {
    return fail('Only a candidate who is Ready to Join can be marked Joined', 400, 'INVALID_STATE')
  }

  const actorName = await getActorName(session)
  preboarding.status = PREBOARDING_STATUS.JOINED
  preboarding.joinedAt = new Date()
  preboarding.activityLog.push({ type: 'STATUS_CHANGED', message: `Marked Joined by ${actorName}`, actorName })
  await preboarding.save()

  await logAction(session, { action: 'PREBOARDING_MARKED_JOINED', entityType: 'Preboarding', entityId: preboarding._id, description: 'Candidate marked joined', req })

  const preview = await syncReadinessStatus(tenantId, preboarding._id)

  return ok(preview?.preboarding || preboarding, 'Candidate marked as joined')
})
