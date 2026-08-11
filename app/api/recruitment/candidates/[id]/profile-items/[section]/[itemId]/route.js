export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { CANDIDATE_MANAGE_ROLES } from '@/lib/candidateConstants'
import Candidate from '@/models/Candidate'
import CandidateSkill from '@/models/CandidateSkill'
import CandidateExperience from '@/models/CandidateExperience'
import CandidateEducation from '@/models/CandidateEducation'
import CandidateCertification from '@/models/CandidateCertification'
import CandidateProject from '@/models/CandidateProject'

const SECTION_MODELS = {
  skills: CandidateSkill, experience: CandidateExperience, education: CandidateEducation,
  certifications: CandidateCertification, projects: CandidateProject,
}
// Only a narrow, low-risk set of fields are editable in place — everything
// else about a resume-extracted row is meant to be corrected by re-parsing
// or replaced, not hand-edited into something the resume never said.
const EDITABLE_FIELDS = {
  skills: ['yearsOfExperience', 'proficiency', 'isVerified'],
  experience: ['isCurrent'],
  education: [],
  certifications: [],
  projects: [],
}

async function resolve(params, session) {
  const tenantId = requireTenantId(session)
  const Model = SECTION_MODELS[params.section]
  if (!Model) throw new ApiError(404, 'Unknown profile section', 'NOT_FOUND')

  const candidate = await Candidate.findOne({ _id: params.id, tenantId, deleted: false })
  if (!candidate) throw new ApiError(404, 'Candidate not found', 'NOT_FOUND')

  const item = await Model.findOne({ _id: params.itemId, tenantId, candidateId: candidate._id })
  if (!item) throw new ApiError(404, 'Item not found', 'NOT_FOUND')

  return { tenantId, Model, candidate, item }
}

// PATCH — e.g. mark a resume-extracted skill as verified.
export const PATCH = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const { candidate, item } = await resolve(params, session)
  const body = await req.json()

  const editable = EDITABLE_FIELDS[params.section] || []
  if (!editable.length) return fail('This section has no editable fields', 400, 'NOT_EDITABLE')

  for (const field of editable) {
    if (Object.prototype.hasOwnProperty.call(body, field)) item[field] = body[field]
  }
  await item.save()

  candidate.activityLog.push({ type: 'PROFILE_UPDATED', message: `Updated ${params.section.slice(0, -1)} entry`, actorName: session.sub })
  await candidate.save()

  return ok(item, 'Updated')
})

// DELETE — removes a wrongly-accepted or outdated structured item. Never
// touches the resume's own parsedData/appliedFields, so the Review UI can
// still show it was applied and let HR re-accept it if this was a mistake.
export const DELETE = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const { Model, candidate, item } = await resolve(params, session)

  const label = item.skillName || item.companyName || item.degree || item.name || 'entry'
  await Model.deleteOne({ _id: item._id })

  candidate.activityLog.push({ type: 'PROFILE_UPDATED', message: `Removed ${params.section.slice(0, -1)}: ${label}`, actorName: session.sub })
  await candidate.save()

  return ok(null, 'Removed')
})
