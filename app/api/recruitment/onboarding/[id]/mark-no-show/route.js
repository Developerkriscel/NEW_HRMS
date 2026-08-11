export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { PREBOARDING_VIEW_ROLES, canManagePreboarding, PREBOARDING_STATUS } from '@/lib/preboardingConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Preboarding from '@/models/Preboarding'

const NOT_ELIGIBLE = [PREBOARDING_STATUS.JOINED, PREBOARDING_STATUS.NO_SHOW, PREBOARDING_STATUS.CANCELLED]

// POST { comment? } — "No Show" tab, for a candidate who simply never
// turned up on their joining date.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManagePreboarding(session)) return fail('You do not have permission to mark this candidate as no-show', 403, 'FORBIDDEN')

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')
  if (NOT_ELIGIBLE.includes(preboarding.status)) return fail(`Cannot mark a ${preboarding.status.toLowerCase()} preboarding as no-show`, 400, 'INVALID_STATE')

  const actorName = await getActorName(session)
  preboarding.status = PREBOARDING_STATUS.NO_SHOW
  preboarding.noShowAt = new Date()
  preboarding.activityLog.push({ type: 'STATUS_CHANGED', message: `Marked No Show by ${actorName}`, comment: body.comment, actorName })
  await preboarding.save()

  await logAction(session, { action: 'PREBOARDING_MARKED_NO_SHOW', entityType: 'Preboarding', entityId: preboarding._id, description: 'Candidate marked no-show', req })

  return ok(preboarding, 'Candidate marked as no-show')
})
