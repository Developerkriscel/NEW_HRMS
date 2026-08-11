export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_MANAGE_ROLES, RESUME_PERMISSIONS, RESUME_PARSING_STATUS } from '@/lib/candidateConstants'
import { applyParsedDataToCandidate } from '@/lib/candidateProfileHelpers'
import Candidate from '@/models/Candidate'
import CandidateResume from '@/models/CandidateResume'

const VALID_FIELDS = new Set([
  'personal.name', 'personal.email', 'personal.phone', 'personal.currentLocation', 'personal.currentCompany',
  'personal.currentDesignation', 'personal.totalExperience', 'personal.relevantExperience',
  'personal.linkedinUrl', 'personal.githubUrl', 'personal.portfolioUrl',
  'skills', 'experience', 'education', 'certifications', 'projects',
])

// POST { fields: ["skills", "experience", "personal.currentCompany", ...] }
// HR-confirmed merge into the candidate profile — this is the only path
// that ever writes resume-extracted data onto the Candidate record or into
// candidate_skills/experience/education/certifications/projects. Parsing
// alone (PARSED status) never touches the profile by itself.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const fields = (Array.isArray(body.fields) ? body.fields : [])
    // "personal.X" keys carry their own dot — strip the "personal." prefix
    // to match applyParsedDataToCandidate's expected key shape (bare field
    // name for personal fields, section name for list sections).
    .map((f) => (f.startsWith('personal.') ? f.slice('personal.'.length) : f))
    .filter((f, i, arr) => arr.indexOf(f) === i)

  if (!fields.length) return fail('No fields selected to apply', 400, 'VALIDATION_ERROR')
  const requestedKeys = new Set((Array.isArray(body.fields) ? body.fields : []))
  for (const key of requestedKeys) {
    if (!VALID_FIELDS.has(key)) return fail(`Unknown field: ${key}`, 400, 'VALIDATION_ERROR')
  }

  const resume = await CandidateResume.findOne({ _id: params.id, tenantId })
  if (!resume) throw new ApiError(404, 'Resume not found', 'NOT_FOUND')
  if (!resume.candidateId) throw new ApiError(400, 'This resume is not yet attached to a candidate', 'NO_CANDIDATE')
  if (![RESUME_PARSING_STATUS.PARSED, RESUME_PARSING_STATUS.REVIEW_REQUIRED].includes(resume.parsingStatus)) {
    return fail('This resume has no extracted data to apply yet', 400, 'INVALID_STATE')
  }

  const candidate = await Candidate.findOne({ _id: resume.candidateId, tenantId, deleted: false })
  if (!candidate) throw new ApiError(404, 'Candidate not found', 'NOT_FOUND')

  const result = await applyParsedDataToCandidate({ resume, candidate, fields, session })

  await logAction(session, {
    action: RESUME_PERMISSIONS.REVIEW, entityType: 'Candidate', entityId: candidate._id,
    description: `Applied resume-extracted fields to candidate profile: ${result.appliedFields.join(', ')}`, req,
  })

  return ok({ candidate, appliedFields: result.appliedFields }, 'Candidate profile updated')
})
