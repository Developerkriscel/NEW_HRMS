export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_VIEW_ROLES, CANDIDATE_MANAGE_ROLES, RESUME_PERMISSIONS } from '@/lib/candidateConstants'
import { createResumeRecord, triggerBackgroundParse } from '@/lib/candidateProfileHelpers'
import Candidate from '@/models/Candidate'
import CandidateResume from '@/models/CandidateResume'

// GET — Documents/Resume tab: every version ever uploaded for this
// candidate, newest first.
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const candidate = await Candidate.findOne({ _id: params.id, tenantId, deleted: false })
  if (!candidate) throw new ApiError(404, 'Candidate not found', 'NOT_FOUND')

  const resumes = await CandidateResume.find({ tenantId, candidateId: candidate._id }).sort({ version: -1 })
  return ok(resumes)
})

// POST — HR uploads another resume version for an existing candidate (e.g.
// the candidate sent an updated resume months later). Never overwrites an
// earlier version — see models/CandidateResume.js.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)

  const candidate = await Candidate.findOne({ _id: params.id, tenantId, deleted: false })
  if (!candidate) throw new ApiError(404, 'Candidate not found', 'NOT_FOUND')

  const formData = await req.formData()
  const file = formData.get('resume')

  const resumeRecord = await createResumeRecord({
    tenantId, candidateId: candidate._id, candidateCode: candidate.candidateCode,
    applicationId: null, file, uploadSource: 'MANUAL_HR',
  })

  candidate.resumeUrl = resumeRecord.fileUrl
  candidate.activityLog.push({ type: 'RESUME_UPLOADED', message: `Resume uploaded by HR: ${resumeRecord.originalFileName || resumeRecord.fileName}`, actorName: session.sub })
  await candidate.save()

  triggerBackgroundParse(resumeRecord._id, tenantId)

  await logAction(session, {
    action: RESUME_PERMISSIONS.UPLOAD, entityType: 'CandidateResume', entityId: resumeRecord._id,
    description: `Uploaded resume version ${resumeRecord.version} for candidate ${candidate.candidateCode}`, req,
  })

  return ok(resumeRecord, 'Resume uploaded — parsing started', 201)
})
