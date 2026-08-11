export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { PREBOARDING_VIEW_ROLES, canManageDocument, DOCUMENT_ITEM_STATUS } from '@/lib/preboardingConstants'
import { recomputePreboardingStatus } from '@/lib/preboardingHelpers'
import { getActorName } from '@/lib/candidateHelpers'
import CandidateDocument from '@/models/CandidateDocument'
import Preboarding from '@/models/Preboarding'

// POST { reason } — "[Waive Requirement]" — "real companies sometimes
// don't have a document at joining." Counts the same as VERIFIED toward
// "documents complete" (DOCUMENT_SATISFIED_STATUSES).
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!body.reason?.trim()) return fail('A reason is required to waive this requirement', 400, 'VALIDATION_ERROR')

  const doc = await CandidateDocument.findOne({ _id: params.documentId, tenantId, preboardingId: params.id, deleted: false })
  if (!doc) throw new ApiError(404, 'Document not found', 'NOT_FOUND')
  if (!canManageDocument(session, doc.category)) return fail('You do not have permission to waive this document requirement', 403, 'FORBIDDEN')

  const actorName = await getActorName(session)
  doc.status = DOCUMENT_ITEM_STATUS.WAIVED
  doc.waivedBy = session.userId
  doc.waivedByName = actorName
  doc.waivedAt = new Date()
  doc.waiverReason = body.reason.trim()
  await doc.save()

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId })
  if (preboarding) {
    preboarding.activityLog.push({ type: 'STATUS_CHANGED', message: `${doc.name} waived by ${actorName} — ${body.reason.trim()}`, actorName })
    await recomputePreboardingStatus(tenantId, preboarding)
    await preboarding.save()
  }

  await logAction(session, { action: 'DOCUMENT_WAIVED', entityType: 'CandidateDocument', entityId: doc._id, description: `${doc.name} waived: ${body.reason}`, req })

  return ok(doc, 'Document requirement waived')
})
