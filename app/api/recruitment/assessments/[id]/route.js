export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { ASSESSMENT_VIEW_ROLES, ASSESSMENT_MANAGE_ROLES } from '@/lib/assessmentConstants'
import { syncAssessmentQuestions, getAssessmentQuestionsFull } from '@/lib/assessmentQuestionHelpers'
import AssessmentTemplate from '@/models/AssessmentTemplate'

const WRITABLE_FIELDS = [
  'name', 'type', 'description', 'instructions', 'durationMinutes', 'totalMarks', 'passingScore', 'maxAttempts',
  'shuffleQuestions', 'showResultToCandidate', 'autoEvaluate', 'submissionType', 'submissionWindowDays', 'status',
]

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ASSESSMENT_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const assessment = await AssessmentTemplate.findOne({ _id: params.id, tenantId, deleted: false }).lean()
  if (!assessment) throw new ApiError(404, 'Assessment not found', 'NOT_FOUND')

  const questions = await getAssessmentQuestionsFull(tenantId, assessment._id)
  return ok({ ...assessment, questions })
})

// PATCH — full update, including replacing the question bank wholesale
// when `questions` is provided (same pattern as Job's screening questions).
export const PATCH = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ASSESSMENT_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const assessment = await AssessmentTemplate.findOne({ _id: params.id, tenantId, deleted: false })
  if (!assessment) throw new ApiError(404, 'Assessment not found', 'NOT_FOUND')

  for (const field of WRITABLE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) assessment[field] = body[field]
  }
  assessment.updatedBy = session.sub

  if (Array.isArray(body.questions)) {
    const computedTotal = await syncAssessmentQuestions(tenantId, assessment._id, body.questions)
    if (computedTotal > 0) assessment.totalMarks = computedTotal
  }

  await assessment.save()
  await logAction(session, { action: 'ASSESSMENT_UPDATED', entityType: 'AssessmentTemplate', entityId: assessment._id, description: `Assessment "${assessment.name}" updated`, req })

  return ok(assessment, 'Assessment updated')
})
