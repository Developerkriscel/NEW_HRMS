export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { ASSESSMENT_MANAGE_ROLES, CANDIDATE_ASSESSMENT_STATUS, EVALUATION_RECOMMENDATION_LIST } from '@/lib/assessmentConstants'
import { decideResult } from '@/lib/assessmentHelpers'
import { getActorName } from '@/lib/candidateHelpers'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import CandidateAssessment from '@/models/CandidateAssessment'
import AssessmentTemplate from '@/models/AssessmentTemplate'
import AssessmentQuestion from '@/models/AssessmentQuestion'
import CandidateAssessmentAnswer from '@/models/CandidateAssessmentAnswer'
import AssessmentEvaluation from '@/models/AssessmentEvaluation'
import Application from '@/models/Application'

// POST { perQuestion?: [{questionId, marksAwarded, comment}], comment, recommendation }
// Manual review for descriptive/file/URL questions the auto-grader
// couldn't score. Never auto-rejects — `recommendation` is advisory
// (item 12), same posture as the AI match label from Step 7.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ASSESSMENT_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (body.recommendation && !EVALUATION_RECOMMENDATION_LIST.includes(body.recommendation)) {
    return fail('Invalid recommendation', 400, 'VALIDATION_ERROR')
  }

  const ca = await CandidateAssessment.findOne({ _id: params.id, tenantId, deleted: false })
  if (!ca) throw new ApiError(404, 'Candidate assessment not found', 'NOT_FOUND')
  if (![CANDIDATE_ASSESSMENT_STATUS.EVALUATING, CANDIDATE_ASSESSMENT_STATUS.SUBMITTED, CANDIDATE_ASSESSMENT_STATUS.COMPLETED].includes(ca.status)) {
    return fail(`Cannot evaluate an assessment in status ${ca.status}`, 400, 'INVALID_STATE')
  }

  const assessment = await AssessmentTemplate.findOne({ _id: ca.assessmentId, tenantId }).lean()
  const questions = await AssessmentQuestion.find({ tenantId, assessmentId: ca.assessmentId }).lean()
  const questionById = new Map(questions.map((q) => [String(q._id), q]))

  for (const entry of body.perQuestion || []) {
    const q = questionById.get(String(entry.questionId))
    if (!q) continue
    const maxAllowed = q.marks
    const marksAwarded = Math.max(0, Math.min(maxAllowed, Number(entry.marksAwarded) || 0))
    await CandidateAssessmentAnswer.updateOne(
      { tenantId, candidateAssessmentId: ca._id, questionId: q._id },
      { marksAwarded, evaluatorComment: entry.comment || null }
    )
  }

  // Recompute the total from every answer row (auto-graded + just-updated
  // manual ones) rather than trusting a client-supplied total.
  const answers = await CandidateAssessmentAnswer.find({ tenantId, candidateAssessmentId: ca._id }).lean()
  const score = answers.reduce((sum, a) => sum + Math.max(0, a.marksAwarded || 0), 0)
  const maxScore = questions.reduce((sum, q) => sum + q.marks, 0)
  const percentage = maxScore > 0 ? Math.round((score / maxScore) * 1000) / 10 : 0

  const actorName = await getActorName(session)
  const evaluation = await AssessmentEvaluation.create({
    tenantId, candidateAssessmentId: ca._id,
    evaluatorId: session.userId, evaluatorName: actorName,
    score, maxScore, scoreBreakdown: ca.scoreBreakdown,
    comment: body.comment || null, recommendation: body.recommendation || null, evaluatedAt: new Date(),
  })

  ca.score = score
  ca.maxScore = maxScore
  ca.percentage = percentage
  ca.result = decideResult(percentage, assessment.passingScore)
  ca.status = CANDIDATE_ASSESSMENT_STATUS.COMPLETED
  ca.evaluatorId = session.userId
  ca.evaluatorName = actorName
  ca.evaluationComment = body.comment || null
  ca.recommendation = body.recommendation || null
  ca.activityLog.push({ type: 'EVALUATED', message: `Evaluated by ${actorName} — ${percentage}% (${ca.result})`, actorName })
  await ca.save()

  const application = await Application.findOne({ _id: ca.applicationId, tenantId })
  if (application) {
    application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.UPDATED, message: `Assessment evaluated: ${assessment.name} — ${percentage}% (${ca.result})`, actorName })
    await application.save()
  }

  await logAction(session, { action: 'ASSESSMENT_EVALUATED', entityType: 'CandidateAssessment', entityId: ca._id, description: `Evaluated: ${percentage}% (${ca.result})`, req })

  return ok({ candidateAssessment: ca, evaluation }, 'Assessment evaluated')
})
