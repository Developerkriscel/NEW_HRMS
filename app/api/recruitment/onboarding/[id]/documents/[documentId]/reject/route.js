export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { PREBOARDING_VIEW_ROLES, canManageDocument, DOCUMENT_ITEM_STATUS, DOCUMENT_REJECTION_REASONS } from '@/lib/preboardingConstants'
import { recomputePreboardingStatus } from '@/lib/preboardingHelpers'
import { getActorName } from '@/lib/candidateHelpers'
import CandidateDocument from '@/models/CandidateDocument'
import CandidateDocumentVersion from '@/models/CandidateDocumentVersion'
import Preboarding from '@/models/Preboarding'

// POST { reason } — "[Reject]" — the document is entirely wrong (item —
// examples: "Wrong document uploaded"). Candidate must upload a fresh one
// under this same requirement.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!body.reason || !DOCUMENT_REJECTION_REASONS.includes(body.reason)) return fail('A valid rejection reason is required', 400, 'VALIDATION_ERROR')

  const doc = await CandidateDocument.findOne({ _id: params.documentId, tenantId, preboardingId: params.id, deleted: false })
  if (!doc) throw new ApiError(404, 'Document not found', 'NOT_FOUND')
  if (!canManageDocument(session, doc.category)) return fail('You do not have permission to reject this document', 403, 'FORBIDDEN')
  if (!doc.currentVersionId) return fail('No file has been uploaded for this document yet', 400, 'INVALID_STATE')

  const actorName = await getActorName(session)
  doc.status = DOCUMENT_ITEM_STATUS.REJECTED
  doc.rejectionReason = body.reason
  doc.verifiedBy = null; doc.verifiedByName = null; doc.verifiedAt = null
  await doc.save()

  await CandidateDocumentVersion.updateOne({ _id: doc.currentVersionId, tenantId }, { status: DOCUMENT_ITEM_STATUS.REJECTED, reviewComment: body.reason })

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId })
  if (preboarding) {
    preboarding.activityLog.push({ type: 'STATUS_CHANGED', message: `${doc.name} rejected by ${actorName} — ${body.reason}`, actorName })
    await recomputePreboardingStatus(tenantId, preboarding)
    await preboarding.save()
  }

  await logAction(session, { action: 'DOCUMENT_REJECTED', entityType: 'CandidateDocument', entityId: doc._id, description: `${doc.name} rejected: ${body.reason}`, req })

  return ok(doc, 'Document rejected')
})
