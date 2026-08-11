export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { PREBOARDING_VIEW_ROLES, canManagePreboarding, FORM_STATUS } from '@/lib/preboardingConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { generateDocumentChecklist, recomputePreboardingStatus } from '@/lib/preboardingHelpers'
import Preboarding from '@/models/Preboarding'

// POST — "Do not automatically approve" (item — HR reviews, then
// explicitly approves). This is also the hook point that materializes the
// document checklist (Step 16) — "Information Submitted -> Document
// Checklist" only happens once information is actually approved.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  if (!canManagePreboarding(session)) return fail('You do not have permission to approve this information', 403, 'FORBIDDEN')

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')
  if (preboarding.formStatus !== FORM_STATUS.SUBMITTED) {
    return fail('Only a submitted form can be approved', 400, 'INVALID_STATE')
  }

  const actorName = await getActorName(session)
  preboarding.formStatus = FORM_STATUS.APPROVED
  preboarding.formApprovedAt = new Date()
  preboarding.correctionRequest = null
  preboarding.activityLog.push({ type: 'STATUS_CHANGED', message: `Information approved by ${actorName}`, actorName })

  await generateDocumentChecklist(tenantId, preboarding)
  await recomputePreboardingStatus(tenantId, preboarding)
  await preboarding.save()

  await logAction(session, { action: 'PREBOARDING_INFORMATION_APPROVED', entityType: 'Preboarding', entityId: preboarding._id, description: 'Preboarding information approved', req })

  return ok(preboarding, 'Information approved')
})
