export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { runForTenant } from '@/lib/tenantDb'
import { resolveAssessmentToken, enforceExpiry, sanitizeQuestionForCandidate } from '@/lib/assessmentHelpers'
import { CANDIDATE_ASSESSMENT_STATUS } from '@/lib/assessmentConstants'
import CandidateAssessment from '@/models/CandidateAssessment'
import AssessmentTemplate from '@/models/AssessmentTemplate'
import AssessmentQuestion from '@/models/AssessmentQuestion'
import AssessmentOption from '@/models/AssessmentOption'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// POST — begins the timed attempt. Computes attemptDeadline server-side
// (min(expiresAt, now + durationMinutes)) — "do not trust the browser
// timer alone" — and every subsequent submit is checked against this
// stored deadline, not anything the client reports.
export const POST = withApi(async (req, { params }) => {
  const resolved = await resolveAssessmentToken(params.token)
  if (!resolved) return fail('This assessment link is invalid', 404, 'NOT_FOUND')

  return runForTenant(resolved.tenant, async () => {
    const ca = await CandidateAssessment.findOne({ _id: resolved.candidateAssessmentId, tenantId: resolved.tenant._id })
    if (!ca) return fail('This assessment link is invalid', 404, 'NOT_FOUND')

    if (enforceExpiry(ca)) { await ca.save(); return fail('This assessment has expired', 400, 'EXPIRED') }
    if (ca.status === CANDIDATE_ASSESSMENT_STATUS.IN_PROGRESS) {
      // Already started (e.g. page refresh) — just hand back the same attempt.
    } else if (![CANDIDATE_ASSESSMENT_STATUS.SENT, CANDIDATE_ASSESSMENT_STATUS.OPENED, CANDIDATE_ASSESSMENT_STATUS.ASSIGNED].includes(ca.status)) {
      return fail(`This assessment cannot be started (status: ${ca.status})`, 400, 'INVALID_STATE')
    }

    const now = new Date()
    if (ca.startDate && now < new Date(ca.startDate)) {
      return fail(`This assessment opens on ${new Date(ca.startDate).toDateString()}`, 400, 'NOT_YET_OPEN')
    }

    const assessment = await AssessmentTemplate.findOne({ _id: ca.assessmentId, tenantId: resolved.tenant._id }).lean()
    if (!assessment) return fail('This assessment is no longer available', 404, 'NOT_FOUND')

    if (ca.status !== CANDIDATE_ASSESSMENT_STATUS.IN_PROGRESS) {
      ca.status = CANDIDATE_ASSESSMENT_STATUS.IN_PROGRESS
      ca.startedAt = now
      ca.attemptDeadline = assessment.durationMinutes
        ? new Date(Math.min(new Date(ca.expiresAt).getTime(), now.getTime() + assessment.durationMinutes * 60000))
        : ca.expiresAt
      ca.activityLog.push({ type: 'STARTED', message: `Attempt ${ca.attemptNumber} started` })
      await ca.save()
    }

    let questions = await AssessmentQuestion.find({ tenantId: resolved.tenant._id, assessmentId: ca.assessmentId }).sort({ order: 1 }).lean()
    const options = await AssessmentOption.find({ tenantId: resolved.tenant._id, questionId: { $in: questions.map((q) => q._id) } }).sort({ order: 1 }).lean()
    const optionsByQuestion = new Map()
    for (const o of options) {
      const key = String(o.questionId)
      if (!optionsByQuestion.has(key)) optionsByQuestion.set(key, [])
      optionsByQuestion.get(key).push(o)
    }
    if (assessment.shuffleQuestions) questions = shuffle(questions)

    return ok({
      startedAt: ca.startedAt,
      attemptDeadline: ca.attemptDeadline,
      questions: questions.map((q) => sanitizeQuestionForCandidate(q, optionsByQuestion.get(String(q._id)))),
    })
  })
})
