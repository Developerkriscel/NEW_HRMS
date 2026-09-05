export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { PREBOARDING_VIEW_ROLES, canManagePreboarding, DOCUMENT_ITEM_STATUS } from '@/lib/preboardingConstants'
import { validateDocumentFile, saveDocumentFile } from '@/lib/preboardingDocumentStorage'
import { recomputePreboardingStatus } from '@/lib/preboardingHelpers'
import Preboarding from '@/models/Preboarding'
import CandidateDocument from '@/models/CandidateDocument'
import CandidateDocumentVersion from '@/models/CandidateDocumentVersion'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  if (!canManagePreboarding(session)) return fail('You do not have permission to upload onboarding documents', 403, 'FORBIDDEN')

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')

  const doc = await CandidateDocument.findOne({ _id: params.documentId, tenantId, preboardingId: params.id, deleted: false })
  if (!doc) throw new ApiError(404, 'Document not found', 'NOT_FOUND')

  const form = await req.formData()
  const file = form.get('file')
  const fileError = validateDocumentFile(file)
  if (fileError) return fail(fileError, 400, 'VALIDATION_ERROR')

  const nextVersionNumber = (await CandidateDocumentVersion.countDocuments({ tenantId, candidateDocumentId: doc._id })) + 1
  const saved = await saveDocumentFile(file, tenantId, doc._id, nextVersionNumber)
  const version = await CandidateDocumentVersion.create({
    tenantId,
    candidateDocumentId: doc._id,
    version: nextVersionNumber,
    ...saved,
    uploadedByCandidate: false,
    status: doc.requiresVerification ? DOCUMENT_ITEM_STATUS.UNDER_REVIEW : DOCUMENT_ITEM_STATUS.VERIFIED,
  })

  doc.currentVersionId = version._id
  doc.status = doc.requiresVerification ? DOCUMENT_ITEM_STATUS.UNDER_REVIEW : DOCUMENT_ITEM_STATUS.VERIFIED
  doc.issueDate = form.get('issueDate') ? new Date(form.get('issueDate')) : null
  doc.expiryDate = form.get('expiryDate') ? new Date(form.get('expiryDate')) : null
  if (!doc.requiresVerification) {
    doc.verifiedByName = session.name || session.sub
    doc.verifiedAt = new Date()
  }
  await doc.save()

  preboarding.activityLog.push({
    type: 'DOCUMENT_UPLOADED',
    message: `Document uploaded: ${doc.name}`,
    actorName: session.name || session.sub,
  })
  await recomputePreboardingStatus(tenantId, preboarding)
  await preboarding.save()

  return ok({ document: doc, version }, 'Document uploaded')
})
