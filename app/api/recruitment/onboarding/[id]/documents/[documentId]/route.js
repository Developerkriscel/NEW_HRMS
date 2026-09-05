export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { PREBOARDING_VIEW_ROLES, canManagePreboarding } from '@/lib/preboardingConstants'
import { recomputePreboardingStatus } from '@/lib/preboardingHelpers'
import Preboarding from '@/models/Preboarding'
import CandidateDocument from '@/models/CandidateDocument'

export const DELETE = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  if (!canManagePreboarding(session)) return fail('You do not have permission to delete onboarding documents', 403, 'FORBIDDEN')

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')

  const doc = await CandidateDocument.findOneAndUpdate(
    { _id: params.documentId, tenantId, preboardingId: params.id, deleted: false },
    { $set: { deleted: true } },
    { new: true }
  )
  if (!doc) throw new ApiError(404, 'Document not found', 'NOT_FOUND')

  preboarding.activityLog.push({
    type: 'DOCUMENT_REMOVED',
    message: `Document removed: ${doc.name}`,
    actorName: session.name || session.sub,
  })
  await recomputePreboardingStatus(tenantId, preboarding)
  await preboarding.save()

  return ok(doc, 'Document removed')
})
