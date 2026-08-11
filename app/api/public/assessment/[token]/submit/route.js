export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { runForTenant } from '@/lib/tenantDb'
import { resolveAssessmentToken, enforceExpiry, gradeAnswer, aggregateScore, decideResult } from '@/lib/assessmentHelpers'
import { saveSubmissionFile, validateSubmissionFile } from '@/lib/assessmentFileStorage'
import { CANDIDATE_ASSESSMENT_STATUS, ASSESSMENT_RESULT } from '@/lib/assessmentConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import CandidateAssessment from '@/models/CandidateAssessment'
import AssessmentTemplate from '@/models/AssessmentTemplate'
import AssessmentQuestion from '@/models/AssessmentQuestion'
import CandidateAssessmentAnswer from '@/models/CandidateAssessmentAnswer'
import Application from '@/models/Application'

// POST — multipart/form-data: `answers` (JSON array of {questionId,
// answer}) plus one `file_<questionId>` field per FILE_UPLOAD question.
// Every check here re-validates server-side — expiry, status, required
// questions — the frontend's own validation is just UX, not the source of
// truth.
export const POST = withApi(async (req, { params }) => {
  const resolved = await resolveAssessmentToken(params.token)
  if (!resolved) return fail('This assessment link is invalid', 404, 'NOT_FOUND')

  return runForTenant(resolved.tenant, async () => {
    const tenantId = resolved.tenant._id
    const ca = await CandidateAssessment.findOne({ _id: resolved.candidateAssessmentId, tenantId })
    if (!ca) return fail('This assessment link is invalid', 404, 'NOT_FOUND')

    if (enforceExpiry(ca)) { await ca.save(); return fail('This assessment has expired', 400, 'EXPIRED') }
    if (ca.status !== CANDIDATE_ASSESSMENT_STATUS.IN_PROGRESS) {
      return fail(`This assessment cannot be submitted (status: ${ca.status})`, 400, 'INVALID_STATE')
    }

    const assessment = await AssessmentTemplate.findOne({ _id: ca.assessmentId, tenantId }).lean()
    const questions = await AssessmentQuestion.find({ tenantId, assessmentId: ca.assessmentId }).lean()
    const questionById = new Map(questions.map((q) => [String(q._id), q]))

    let formData
    try {
      formData = await req.formData()
    } catch {
      return fail('Invalid submission', 400, 'VALIDATION_ERROR')
    }

    let rawAnswers = []
    try {
      rawAnswers = JSON.parse(formData.get('answers') || '[]')
    } catch {
      return fail('Invalid answers payload', 400, 'VALIDATION_ERROR')
    }
    const answerByQuestion = new Map(rawAnswers.map((a) => [String(a.questionId), a.answer]))

    const missingRequired = questions.filter((q) => q.isRequired && q.type !== 'FILE_UPLOAD' && !answerByQuestion.has(String(q._id)))
      .filter((q) => !formData.get(`file_${q._id}`))
    if (missingRequired.length) {
      return fail('Please answer all required questions', 400, 'VALIDATION_ERROR', { missingQuestionIds: missingRequired.map((q) => String(q._id)) })
    }

    const answerDocs = []
    for (const q of questions) {
      let answer = answerByQuestion.get(String(q._id)) ?? null

      if (q.type === 'FILE_UPLOAD') {
        const file = formData.get(`file_${q._id}`)
        if (file && typeof file !== 'string') {
          const error = validateSubmissionFile(file)
          if (error) return fail(error, 400, 'VALIDATION_ERROR')
          const saved = await saveSubmissionFile(file, tenantId, ca._id, q._id)
          answer = saved.url
        }
      }
      if (answer === null || answer === undefined) continue

      const graded = gradeAnswer(q, answer)
      answerDocs.push({
        tenantId, candidateAssessmentId: ca._id, questionId: q._id,
        questionText: q.questionText, questionType: q.type, marks: q.marks, skillCategory: q.skillCategory,
        answer, ...graded,
      })
    }
    if (answerDocs.length) await CandidateAssessmentAnswer.insertMany(answerDocs)

    const { score, maxScore, percentage, breakdown, needsManualEval } = aggregateScore(answerDocs, questions)
    const now = new Date()

    ca.submittedAt = now
    ca.durationUsedMinutes = ca.startedAt ? Math.round((now.getTime() - new Date(ca.startedAt).getTime()) / 60000) : null
    ca.score = score
    ca.maxScore = maxScore
    ca.percentage = percentage
    ca.scoreBreakdown = breakdown

    if (needsManualEval || !assessment.autoEvaluate) {
      ca.status = needsManualEval ? CANDIDATE_ASSESSMENT_STATUS.EVALUATING : CANDIDATE_ASSESSMENT_STATUS.SUBMITTED
      ca.result = ASSESSMENT_RESULT.PENDING
    } else {
      ca.status = CANDIDATE_ASSESSMENT_STATUS.COMPLETED
      ca.result = decideResult(percentage, assessment.passingScore)
    }
    ca.activityLog.push({ type: 'SUBMITTED', message: `Submitted — ${percentage}%${ca.result !== 'PENDING' ? ` (${ca.result})` : ', awaiting evaluation'}` })
    await ca.save()

    const application = await Application.findOne({ _id: ca.applicationId, tenantId })
    if (application) {
      application.activityLog.push({
        type: ACTIVITY_ENTRY_TYPE.UPDATED,
        message: `Assessment "${assessment.name}" submitted — ${percentage}%${ca.result !== 'PENDING' ? ` (${ca.result})` : ''}`,
      })
      await application.save()
    }

    return ok({ status: ca.status, percentage, result: ca.result, showResult: assessment.showResultToCandidate }, 'Assessment submitted successfully')
  })
})
