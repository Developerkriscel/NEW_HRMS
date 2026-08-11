export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { runForTenant } from '@/lib/tenantDb'
import { resolveAssessmentToken, enforceExpiry } from '@/lib/assessmentHelpers'
import { CANDIDATE_ASSESSMENT_STATUS } from '@/lib/assessmentConstants'
import CandidateAssessment from '@/models/CandidateAssessment'
import AssessmentTemplate from '@/models/AssessmentTemplate'
import AssessmentQuestion from '@/models/AssessmentQuestion'
import Candidate from '@/models/Candidate'

// GET — the "before you start" screen: name, question count, duration,
// passing score, attempts allowed. Never leaks question content, correct
// answers, or other candidates' data — this route is unauthenticated by
// design (see lib/assessmentHelpers.js's token scheme).
export const GET = withApi(async (req, { params }) => {
  const resolved = await resolveAssessmentToken(params.token)
  if (!resolved) return fail('This assessment link is invalid', 404, 'NOT_FOUND')

  return runForTenant(resolved.tenant, async () => {
    const ca = await CandidateAssessment.findOne({ _id: resolved.candidateAssessmentId, tenantId: resolved.tenant._id })
    if (!ca) return fail('This assessment link is invalid', 404, 'NOT_FOUND')

    if (enforceExpiry(ca)) await ca.save()

    const [assessment, candidate, questionCount] = await Promise.all([
      AssessmentTemplate.findOne({ _id: ca.assessmentId, tenantId: resolved.tenant._id }).lean(),
      Candidate.findOne({ _id: ca.candidateId, tenantId: resolved.tenant._id }).lean(),
      AssessmentQuestion.countDocuments({ tenantId: resolved.tenant._id, assessmentId: ca.assessmentId }),
    ])
    if (!assessment) return fail('This assessment is no longer available', 404, 'NOT_FOUND')

    // First view (before Start is clicked) transitions SENT -> OPENED — a
    // real, meaningful "the candidate has seen this" signal for HR.
    if (ca.status === CANDIDATE_ASSESSMENT_STATUS.SENT) {
      ca.status = CANDIDATE_ASSESSMENT_STATUS.OPENED
      ca.activityLog.push({ type: 'OPENED', message: 'Candidate opened the assessment link' })
      await ca.save()
    }

    return ok({
      status: ca.status,
      candidateName: candidate?.getFullName ? candidate.getFullName() : `${candidate?.firstName || ''} ${candidate?.lastName || ''}`.trim(),
      assessmentName: assessment.name,
      type: assessment.type,
      instructions: assessment.instructions,
      durationMinutes: assessment.durationMinutes,
      questionCount,
      passingScore: assessment.passingScore,
      maxAttempts: ca.maxAttempts,
      attemptNumber: ca.attemptNumber,
      startDate: ca.startDate,
      expiresAt: ca.expiresAt,
      startedAt: ca.startedAt,
      attemptDeadline: ca.attemptDeadline,
      submittedAt: ca.submittedAt,
      showResultToCandidate: assessment.showResultToCandidate,
      result: (ca.status === CANDIDATE_ASSESSMENT_STATUS.COMPLETED && assessment.showResultToCandidate)
        ? { score: ca.score, maxScore: ca.maxScore, percentage: ca.percentage, result: ca.result }
        : null,
    })
  })
})
