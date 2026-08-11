export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { ASSESSMENT_VIEW_ROLES } from '@/lib/assessmentConstants'
import { enforceExpiry } from '@/lib/assessmentHelpers'
import CandidateAssessment from '@/models/CandidateAssessment'
import AssessmentTemplate from '@/models/AssessmentTemplate'
import CandidateAssessmentAnswer from '@/models/CandidateAssessmentAnswer'
import AssessmentEvaluation from '@/models/AssessmentEvaluation'

// GET — HR's result view: score, breakdown, every answer (with the
// question's correct answer alongside it for objective types), and the
// full evaluation history for descriptive/file questions.
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ASSESSMENT_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const ca = await CandidateAssessment.findOne({ _id: params.id, tenantId, deleted: false })
    .populate('candidateId')
    .populate('jobId', 'jobTitle publicTitle')
    .populate('assignedBy', 'firstName lastName')
    .populate('evaluatorId', 'firstName lastName')
  if (!ca) throw new ApiError(404, 'Candidate assessment not found', 'NOT_FOUND')

  if (enforceExpiry(ca)) await ca.save()

  const [assessment, answers, evaluations] = await Promise.all([
    AssessmentTemplate.findOne({ _id: ca.assessmentId, tenantId }).lean(),
    CandidateAssessmentAnswer.find({ tenantId, candidateAssessmentId: ca._id }).sort({ createdAt: 1 }).lean(),
    AssessmentEvaluation.find({ tenantId, candidateAssessmentId: ca._id }).sort({ evaluatedAt: -1 }).lean(),
  ])

  return ok({ ...ca.toObject(), assessment, answers, evaluations })
})
