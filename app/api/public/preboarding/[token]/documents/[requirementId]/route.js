export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { runForTenant } from '@/lib/tenantDb'
import { resolvePreboardingTokenClaims, resolvePreboardingAccessToken } from '@/lib/preboardingTokenHelpers'
import { recomputePreboardingStatus } from '@/lib/preboardingHelpers'
import { validateDocumentFile, saveDocumentFile } from '@/lib/preboardingDocumentStorage'
import { DOCUMENT_ITEM_STATUS, PREBOARDING_STATUS } from '@/lib/preboardingConstants'
import Preboarding from '@/models/Preboarding'
import CandidateDocument from '@/models/CandidateDocument'
import CandidateDocumentVersion from '@/models/CandidateDocumentVersion'
import DocumentRequirement from '@/models/DocumentRequirement'

const UPLOADABLE = [
  DOCUMENT_ITEM_STATUS.NOT_UPLOADED, DOCUMENT_ITEM_STATUS.REJECTED, DOCUMENT_ITEM_STATUS.REPLACEMENT_REQUIRED,
]

// POST multipart/form-data { file, issueDate?, expiryDate? } — candidate
// upload/replacement. Never destroys the previous version (item 8): a new
// candidate_document_versions row is always created, the parent just moves
// its currentVersionId pointer.
export const POST = withApi(async (req, { params }) => {
  const claims = await resolvePreboardingTokenClaims(params.token)
  if (!claims) return fail('This form link is invalid', 404, 'INVALID_TOKEN')

  const formData = await req.formData()
  const file = formData.get('file')
  const issueDate = formData.get('issueDate')
  const expiryDate = formData.get('expiryDate')

  return runForTenant(claims.tenant, async () => {
    const tokenDoc = await resolvePreboardingAccessToken(claims.tenant._id, claims.preboardingId, claims.jti)
    if (!tokenDoc) return fail('This form link is invalid', 404, 'INVALID_TOKEN')

    const tenantId = claims.tenant._id
    const preboarding = await Preboarding.findOne({ _id: claims.preboardingId, tenantId, deleted: false })
    if (!preboarding) return fail('This form link is invalid', 404, 'INVALID_TOKEN')
    if (preboarding.status === PREBOARDING_STATUS.CANCELLED) return fail('This preboarding is no longer active', 400, 'INVALID_STATE')

    const doc = await CandidateDocument.findOne({ tenantId, preboardingId: preboarding._id, requirementId: params.requirementId, deleted: false })
    if (!doc) return fail('That document requirement was not found', 404, 'NOT_FOUND')
    if (!UPLOADABLE.includes(doc.status)) return fail(`This document is already ${doc.status.toLowerCase().replace('_', ' ')} and cannot be re-uploaded`, 400, 'INVALID_STATE')

    const requirement = await DocumentRequirement.findOne({ tenantId, _id: doc.requirementId })
    const validationError = validateDocumentFile(file, requirement?.allowedFileTypes, requirement?.maxFileSize)
    if (validationError) return fail(validationError, 400, 'VALIDATION_ERROR')

    const nextVersionNumber = (await CandidateDocumentVersion.countDocuments({ tenantId, candidateDocumentId: doc._id })) + 1
    const saved = await saveDocumentFile(file, tenantId, doc._id, nextVersionNumber)

    const initialStatus = doc.requiresVerification ? DOCUMENT_ITEM_STATUS.UNDER_REVIEW : DOCUMENT_ITEM_STATUS.VERIFIED
    const version = await CandidateDocumentVersion.create({
      tenantId, candidateDocumentId: doc._id, version: nextVersionNumber,
      storageKey: saved.storageKey, fileName: saved.fileName, mimeType: saved.mimeType, size: saved.size,
      uploadedByCandidate: true, status: initialStatus,
    })

    doc.currentVersionId = version._id
    doc.status = initialStatus
    doc.rejectionReason = null
    if (doc.tracksExpiry) {
      if (issueDate) doc.issueDate = new Date(issueDate)
      if (expiryDate) doc.expiryDate = new Date(expiryDate)
    }
    if (initialStatus === DOCUMENT_ITEM_STATUS.VERIFIED) {
      doc.verifiedAt = new Date()
      doc.verifiedByName = 'Auto-accepted'
    }
    await doc.save()

    preboarding.activityLog.push({ type: 'UPDATED', message: `Candidate uploaded ${doc.name} (V${nextVersionNumber})` })
    await recomputePreboardingStatus(tenantId, preboarding)
    await preboarding.save()

    return ok({ status: doc.status, version: nextVersionNumber }, 'Document uploaded')
  })
})
