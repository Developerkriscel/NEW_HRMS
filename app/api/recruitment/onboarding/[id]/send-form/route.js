export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { PREBOARDING_VIEW_ROLES, canManagePreboarding, FORM_STATUS } from '@/lib/preboardingConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { ensurePreboardingDetailRows } from '@/lib/preboardingHelpers'
import { issuePreboardingToken, revokePreboardingTokens } from '@/lib/preboardingTokenHelpers'
import Preboarding from '@/models/Preboarding'

// POST — "[Send Information Form]". Same "no email infra" honesty as
// Step 14's Send Offer: marks the form SENT and returns a fresh secure
// link immediately for HR to copy/share. Re-issuing revokes any earlier link.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  if (!canManagePreboarding(session)) return fail('You do not have permission to send this form', 403, 'FORBIDDEN')

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')

  await ensurePreboardingDetailRows(tenantId, preboarding._id)

  const actorName = await getActorName(session)
  await revokePreboardingTokens(tenantId, preboarding._id)
  const token = await issuePreboardingToken(tenantId, preboarding._id)

  if (preboarding.formStatus === FORM_STATUS.NOT_SENT) preboarding.formStatus = FORM_STATUS.SENT
  preboarding.formSentAt = new Date()
  preboarding.activityLog.push({ type: 'STATUS_CHANGED', message: `Information form sent by ${actorName}`, actorName })
  await preboarding.save()

  await logAction(session, { action: 'PREBOARDING_FORM_SENT', entityType: 'Preboarding', entityId: preboarding._id, description: 'Preboarding information form sent', req })

  return ok({ preboarding, portalUrl: `/candidate/preboarding/${token}` }, 'Information form sent')
})
