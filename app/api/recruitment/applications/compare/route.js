export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { CANDIDATE_VIEW_ROLES } from '@/lib/candidateConstants'
import Application from '@/models/Application'
import CandidateJobMatch from '@/models/CandidateJobMatch'
import JobSkill from '@/models/JobSkill'
import ApplicationAnswer from '@/models/ApplicationAnswer'

// GET ?ids=applicationId1,applicationId2,... — item 13's Candidate
// Comparison table. Capped at 5 to keep the comparison table readable.
export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const { searchParams } = new URL(req.url)
  const ids = (searchParams.get('ids') || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, 5)
  if (!ids.length) return fail('ids is required', 400, 'VALIDATION_ERROR')

  const applications = await Application.find({ _id: { $in: ids }, tenantId, deleted: false })
    .populate('candidateId')
    .populate('jobId', 'jobTitle publicTitle')

  const [matches, jobSkillsByJob, answersByApplication] = await Promise.all([
    CandidateJobMatch.find({ tenantId, applicationId: { $in: ids } }).lean(),
    JobSkill.find({ tenantId, jobId: { $in: applications.map((a) => a.jobId?._id).filter(Boolean) } }).lean(),
    ApplicationAnswer.find({ tenantId, applicationId: { $in: ids } }).lean(),
  ])
  const matchByApplication = new Map(matches.map((m) => [String(m.applicationId), m]))

  const rows = applications.map((a) => {
    const match = matchByApplication.get(String(a._id))
    const requiredSkillCount = jobSkillsByJob.filter((s) => String(s.jobId) === String(a.jobId?._id) && s.type === 'REQUIRED').length
    const matchedRequired = match?.matchedSkills?.required?.length ?? null
    const answers = answersByApplication.filter((ans) => String(ans.applicationId) === String(a._id))
    const answeredCount = answers.filter((ans) => ans.answer !== null && ans.answer !== undefined && String(ans.answer).trim() !== '').length

    return {
      applicationId: a._id,
      candidateId: a.candidateId?._id,
      candidateName: a.candidateId?.getFullName ? a.candidateId.getFullName() : `${a.candidateId?.firstName} ${a.candidateId?.lastName}`,
      jobTitle: a.jobId?.publicTitle || a.jobId?.jobTitle,
      aiMatchScore: match?.overallScore ?? null,
      matchLabel: match?.matchLabel ?? null,
      experience: a.candidateId?.totalExperience ?? null,
      requiredSkillsMatched: matchedRequired != null ? `${matchedRequired}/${requiredSkillCount}` : null,
      expectedCtc: a.candidateId?.expectedCtc ?? null,
      noticePeriod: a.candidateId?.noticePeriod ?? null,
      screening: answers.length ? `${answeredCount}/${answers.length}` : null,
      screeningScore: match?.screeningScore ?? null,
      stage: a.currentStageName,
      status: a.status,
    }
  })

  return ok(rows)
})
