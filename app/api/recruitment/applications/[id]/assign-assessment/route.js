export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { ASSESSMENT_MANAGE_ROLES, CANDIDATE_ASSESSMENT_STATUS } from '@/lib/assessmentConstants'
import { ACTIVITY_ENTRY_TYPE, APPLICATION_STATUS } from '@/lib/candidateConstants'
import { issueAssessmentToken } from '@/lib/assessmentHelpers'
import { getActorName } from '@/lib/candidateHelpers'
import Application from '@/models/Application'
import AssessmentTemplate from '@/models/AssessmentTemplate'
import CandidateAssessment from '@/models/CandidateAssessment'

// POST { assessmentId, startDate?, expiryDate, maxAttempts?, message? }
// "[Send Assessment]" — there's no email infra in this codebase (same
// limitation noted since Step 5), so "sending" means generating the secure
// link immediately (status: SENT) rather than actually delivering
// anything; the link itself is returned so HR can copy/share it.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ASSESSMENT_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!body.assessmentId) return fail('assessmentId is required', 400, 'VALIDATION_ERROR')
  if (!body.expiryDate) return fail('Expiry date is required', 400, 'VALIDATION_ERROR')

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')
  if (![APPLICATION_STATUS.ACTIVE, APPLICATION_STATUS.ON_HOLD].includes(application.status)) {
    return fail(`Cannot assign an assessment to a ${application.status.toLowerCase()} application`, 400, 'INVALID_STATE')
  }

  const assessment = await AssessmentTemplate.findOne({ _id: body.assessmentId, tenantId, deleted: false })
  if (!assessment) throw new ApiError(404, 'Assessment not found', 'NOT_FOUND')

  const actorName = await getActorName(session)

  const candidateAssessment = await CandidateAssessment.create({
    tenantId,
    applicationId: application._id, candidateId: application.candidateId, jobId: application.jobId, assessmentId: assessment._id,
    token: 'pending', // replaced immediately below once we have the real _id
    status: CANDIDATE_ASSESSMENT_STATUS.SENT,
    assignedBy: session.userId, assignedByName: actorName, assignedAt: new Date(),
    messageToCandidate: body.message || null,
    startDate: body.startDate || null,
    expiresAt: new Date(body.expiryDate),
    maxAttempts: body.maxAttempts || assessment.maxAttempts || 1,
    activityLog: [{ type: 'ASSIGNED', message: `Assigned "${assessment.name}" by ${actorName}` }],
  })
  candidateAssessment.token = issueAssessmentToken(tenantId, candidateAssessment._id)
  await candidateAssessment.save()

  application.activityLog.push({
    type: ACTIVITY_ENTRY_TYPE.UPDATED,
    message: `Assessment assigned: ${assessment.name}`,
    actorName,
  })
  await application.save()

  await logAction(session, { action: 'ASSESSMENT_ASSIGNED', entityType: 'CandidateAssessment', entityId: candidateAssessment._id, description: `Assigned "${assessment.name}" to application ${application.applicationCode}`, req })

  return ok({ ...candidateAssessment.toObject(), portalUrl: `/candidate/assessment/${candidateAssessment.token}` }, 'Assessment assigned', 201)
})
