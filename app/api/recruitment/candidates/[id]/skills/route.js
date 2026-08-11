export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { CANDIDATE_MANAGE_ROLES } from '@/lib/candidateConstants'
import Candidate from '@/models/Candidate'
import CandidateSkill from '@/models/CandidateSkill'

// POST — HR manually adds a skill (source: MANUAL). Resume-extracted
// skills come from POST /api/recruitment/resumes/:id/apply-parsed-data
// instead, with source: RESUME.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!body.skillName?.trim()) return fail('Skill name is required', 400, 'VALIDATION_ERROR')

  const candidate = await Candidate.findOne({ _id: params.id, tenantId, deleted: false })
  if (!candidate) throw new ApiError(404, 'Candidate not found', 'NOT_FOUND')

  const skillName = body.skillName.trim()
  const already = await CandidateSkill.findOne({ tenantId, candidateId: candidate._id, skillName: { $regex: `^${skillName}$`, $options: 'i' } })
  if (already) return fail('This skill is already on the candidate profile', 400, 'DUPLICATE_SKILL')

  const skill = await CandidateSkill.create({
    tenantId, candidateId: candidate._id,
    skillName, yearsOfExperience: body.yearsOfExperience ?? null, proficiency: body.proficiency || null,
    source: 'MANUAL', isVerified: true, // HR typed it in directly — no extraction confidence to doubt
  })

  candidate.activityLog.push({ type: 'PROFILE_UPDATED', message: `Skill added: ${skillName}`, actorName: session.sub })
  await candidate.save()

  return ok(skill, 'Skill added', 201)
})
