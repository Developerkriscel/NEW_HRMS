export const dynamic = 'force-dynamic'

import mongoose from 'mongoose'
import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { ASSESSMENT_VIEW_ROLES, ASSESSMENT_MANAGE_ROLES } from '@/lib/assessmentConstants'
import { syncAssessmentQuestions } from '@/lib/assessmentQuestionHelpers'
import { getActorName } from '@/lib/candidateHelpers'
import AssessmentTemplate from '@/models/AssessmentTemplate'
import AssessmentQuestion from '@/models/AssessmentQuestion'
import CandidateAssessment from '@/models/CandidateAssessment'

// GET — Assessment Master list. "Used In" is computed, not stored: how
// many distinct jobs/candidates this assessment has actually been assigned
// to, so the count never drifts from reality.
export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ASSESSMENT_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 20)
  const type = searchParams.get('type')
  const status = searchParams.get('status')
  const createdBy = searchParams.get('createdBy')
  const jobId = searchParams.get('job')

  const query = { tenantId, deleted: false }
  if (type) query.type = type
  if (status) query.status = status
  if (createdBy) query.createdByEmployee = createdBy

  let assessmentIds = null
  if (jobId) {
    const used = await CandidateAssessment.find({ tenantId, jobId }).select('assessmentId')
    assessmentIds = used.map((u) => u.assessmentId)
    query._id = { $in: assessmentIds }
  }

  const totalElements = await AssessmentTemplate.countDocuments(query)
  const assessments = await AssessmentTemplate.find(query).sort({ createdAt: -1 }).skip(page * size).limit(size).lean()

  const assessmentIdList = assessments.map((a) => a._id)
  const tenantObjectId = new mongoose.Types.ObjectId(tenantId)
  const [questionCounts, usage] = await Promise.all([
    AssessmentQuestion.aggregate([
      { $match: { tenantId: tenantObjectId, assessmentId: { $in: assessmentIdList } } },
      { $group: { _id: '$assessmentId', count: { $sum: 1 } } },
    ]),
    CandidateAssessment.aggregate([
      { $match: { tenantId: tenantObjectId, assessmentId: { $in: assessmentIdList } } },
      { $group: { _id: '$assessmentId', jobIds: { $addToSet: '$jobId' } } },
    ]),
  ])
  const questionCountMap = new Map(questionCounts.map((q) => [String(q._id), q.count]))
  const usageMap = new Map(usage.map((u) => [String(u._id), u.jobIds.length]))

  const rows = assessments.map((a) => ({
    ...a,
    questionCount: questionCountMap.get(String(a._id)) || 0,
    usedInJobs: usageMap.get(String(a._id)) || 0,
  }))

  return ok(paged(rows, page, size, totalElements))
})

// POST — Create Assessment. Accepts nested `questions` (item 3's two
// field-sets, discriminated by `type`) synced via syncAssessmentQuestions.
export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ASSESSMENT_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!body.name?.trim()) return fail('Assessment name is required', 400, 'VALIDATION_ERROR')
  if (!body.type) return fail('Assessment type is required', 400, 'VALIDATION_ERROR')
  if (!body.instructions?.trim()) return fail('Instructions are required', 400, 'VALIDATION_ERROR')

  const actorName = await getActorName(session)
  const assessment = await AssessmentTemplate.create({
    tenantId,
    name: body.name.trim(), type: body.type, description: body.description || null, instructions: body.instructions.trim(),
    durationMinutes: body.durationMinutes || null, totalMarks: body.totalMarks || 0, passingScore: body.passingScore ?? null,
    maxAttempts: body.maxAttempts || 1,
    shuffleQuestions: !!body.shuffleQuestions, showResultToCandidate: body.showResultToCandidate !== false, autoEvaluate: body.autoEvaluate !== false,
    submissionType: body.type === 'TAKE_HOME_ASSIGNMENT' ? (body.submissionType || 'FILE_UPLOAD') : null,
    submissionWindowDays: body.submissionWindowDays || null,
    status: body.status || 'ACTIVE',
    createdByEmployee: session.userId, createdByName: actorName,
  })

  const computedTotal = await syncAssessmentQuestions(tenantId, assessment._id, body.questions || [])
  if (computedTotal > 0) {
    assessment.totalMarks = computedTotal
    await assessment.save()
  }

  await logAction(session, { action: 'ASSESSMENT_CREATED', entityType: 'AssessmentTemplate', entityId: assessment._id, description: `Assessment "${assessment.name}" created`, req })

  return ok(assessment, 'Assessment created', 201)
})
