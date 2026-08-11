export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { PREBOARDING_VIEW_ROLES, canManageDocument, DOCUMENT_ITEM_STATUS } from '@/lib/preboardingConstants'
import { recomputePreboardingStatus } from '@/lib/preboardingHelpers'
import { getActorName } from '@/lib/candidateHelpers'
import CandidateDocument from '@/models/CandidateDocument'
import CandidateDocumentVersion from '@/models/CandidateDocumentVersion'
import Preboarding from '@/models/Preboarding'

// POST — "[Verify]". Stores verifiedBy/verifiedAt on both the document and
// its current version.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const doc = await CandidateDocument.findOne({ _id: params.documentId, tenantId, preboardingId: params.id, deleted: false })
  if (!doc) throw new ApiError(404, 'Document not found', 'NOT_FOUND')
  if (!canManageDocument(session, doc.category)) return fail('You do not have permission to verify this document', 403, 'FORBIDDEN')
  if (!doc.currentVersionId) return fail('No file has been uploaded for this document yet', 400, 'INVALID_STATE')

  const actorName = await getActorName(session)
  doc.status = DOCUMENT_ITEM_STATUS.VERIFIED
  doc.verifiedBy = session.userId
  doc.verifiedByName = actorName
  doc.verifiedAt = new Date()
  doc.rejectionReason = null
  await doc.save()

  await CandidateDocumentVersion.updateOne({ _id: doc.currentVersionId, tenantId }, { status: DOCUMENT_ITEM_STATUS.VERIFIED, reviewComment: null })

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId })
  if (preboarding) {
    preboarding.activityLog.push({ type: 'STATUS_CHANGED', message: `${doc.name} verified by ${actorName}`, actorName })
    await recomputePreboardingStatus(tenantId, preboarding)
    await preboarding.save()
  }

  await logAction(session, { action: 'DOCUMENT_VERIFIED', entityType: 'CandidateDocument', entityId: doc._id, description: `${doc.name} verified`, req })

  return ok(doc, 'Document verified')
})
