export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { CANDIDATE_VIEW_ROLES } from '@/lib/candidateConstants'
import Candidate from '@/models/Candidate'
import CandidateSkill from '@/models/CandidateSkill'
import CandidateExperience from '@/models/CandidateExperience'
import CandidateEducation from '@/models/CandidateEducation'
import CandidateCertification from '@/models/CandidateCertification'
import CandidateProject from '@/models/CandidateProject'

// GET — backs the Experience / Education / Skills profile tabs: the
// structured rows built up from resume extraction + manual entry, never a
// comma-joined string (see models/CandidateSkill.js).
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const candidate = await Candidate.findOne({ _id: params.id, tenantId, deleted: false }).select('_id')
  if (!candidate) throw new ApiError(404, 'Candidate not found', 'NOT_FOUND')

  const [skills, experience, education, certifications, projects] = await Promise.all([
    CandidateSkill.find({ tenantId, candidateId: candidate._id }).sort({ createdAt: -1 }),
    CandidateExperience.find({ tenantId, candidateId: candidate._id }).sort({ startDate: -1 }),
    CandidateEducation.find({ tenantId, candidateId: candidate._id }).sort({ endYear: -1 }),
    CandidateCertification.find({ tenantId, candidateId: candidate._id }).sort({ createdAt: -1 }),
    CandidateProject.find({ tenantId, candidateId: candidate._id }).sort({ createdAt: -1 }),
  ])

  return ok({ skills, experience, education, certifications, projects })
})
