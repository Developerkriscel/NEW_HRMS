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

// POST { reason } — "[Request Replacement]" — the *document type* is right,
// this specific scan/copy isn't good enough (item's own example: "Uploaded
// image is not readable"). Distinct from Reject only in framing/status;
// candidate still uploads a new version under the same requirement either way.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!body.reason || !DOCUMENT_REJECTION_REASONS.includes(body.reason)) return fail('A valid reason is required', 400, 'VALIDATION_ERROR')

  const doc = await CandidateDocument.findOne({ _id: params.documentId, tenantId, preboardingId: params.id, deleted: false })
  if (!doc) throw new ApiError(404, 'Document not found', 'NOT_FOUND')
  if (!canManageDocument(session, doc.category)) return fail('You do not have permission to act on this document', 403, 'FORBIDDEN')
  if (!doc.currentVersionId) return fail('No file has been uploaded for this document yet', 400, 'INVALID_STATE')

  const actorName = await getActorName(session)
  doc.status = DOCUMENT_ITEM_STATUS.REPLACEMENT_REQUIRED
  doc.rejectionReason = body.reason
  doc.verifiedBy = null; doc.verifiedByName = null; doc.verifiedAt = null
  await doc.save()

  await CandidateDocumentVersion.updateOne({ _id: doc.currentVersionId, tenantId }, { status: DOCUMENT_ITEM_STATUS.REPLACEMENT_REQUIRED, reviewComment: body.reason })

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId })
  if (preboarding) {
    preboarding.activityLog.push({ type: 'STATUS_CHANGED', message: `Replacement requested for ${doc.name} by ${actorName} — ${body.reason}`, actorName })
    await recomputePreboardingStatus(tenantId, preboarding)
    await preboarding.save()
  }

  await logAction(session, { action: 'DOCUMENT_REPLACEMENT_REQUESTED', entityType: 'CandidateDocument', entityId: doc._id, description: `Replacement requested for ${doc.name}: ${body.reason}`, req })

  return ok(doc, 'Replacement requested')
})
