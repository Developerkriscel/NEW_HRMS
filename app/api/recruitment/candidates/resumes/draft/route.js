export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { CANDIDATE_MANAGE_ROLES } from '@/lib/candidateConstants'
import { createResumeRecord, runParseAndPersist } from '@/lib/candidateProfileHelpers'

// POST — Manual Candidate Entry flow: HR uploads a resume *before* any
// Candidate record exists. Parses it synchronously (HR is actively waiting
// on the Add Candidate screen here, unlike a public applicant) and returns
// the extracted data so the create form can be auto-filled. The resume row
// is saved with candidateId: null until the candidate is actually created
// — see claimDraftResume() in lib/candidateProfileHelpers.js, used by
// POST /api/recruitment/candidates.
export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)

  const formData = await req.formData()
  const file = formData.get('resume')

  const resumeRecord = await createResumeRecord({
    tenantId, candidateId: null, applicationId: null, file, uploadSource: 'MANUAL_HR',
  })

  const parsed = await runParseAndPersist(resumeRecord._id, tenantId)

  return ok({
    resumeId: String(resumeRecord._id),
    fileUrl: resumeRecord.fileUrl,
    fileName: resumeRecord.originalFileName || resumeRecord.fileName,
    parsingStatus: parsed?.parsingStatus || resumeRecord.parsingStatus,
    parsedData: parsed?.parsedData || null,
    errorMessage: parsed?.errorMessage || null,
  }, 'Resume parsed', 201)
})
