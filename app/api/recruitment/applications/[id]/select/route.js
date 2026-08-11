export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { SELECTION_MANAGE_ROLES, canManageSelections, SELECTION_DECISION_TYPE, SELECTION_STATUS, SELECTION_APPROVAL_LEVEL, APPROVAL_STATUS } from '@/lib/selectionConstants'
import { APPLICATION_STATUS, ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { getRecruitmentSettings, computeVacancyStatus } from '@/lib/selectionHelpers'
import Application from '@/models/Application'
import Job from '@/models/Job'
import SelectionDecision from '@/models/SelectionDecision'

// POST { recommendedDesignationId?, recommendedDepartmentId?, recommendedManagerId?,
//        proposedJoiningDate, employmentType?, comments? }
// "Selected only means: Company wants to proceed with the candidate" — this
// never marks the candidate hired, and never sends anything to them. The
// vacancy check is a warning returned alongside the result, not a block
// ("companies sometimes deliberately keep backup candidates").
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, SELECTION_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageSelections(session)) return fail('You do not have permission to record a selection decision', 403, 'FORBIDDEN')
  if (!body.proposedJoiningDate) return fail('A recommended joining date is required', 400, 'VALIDATION_ERROR')

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')
  if ([APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.WITHDRAWN, APPLICATION_STATUS.HIRED].includes(application.status)) {
    return fail(`Cannot select a ${application.status.toLowerCase()} application`, 400, 'INVALID_STATE')
  }

  const job = await Job.findOne({ _id: application.jobId, tenantId, deleted: false })
  const vacancy = job ? await computeVacancyStatus(job, tenantId, { excludeApplicationId: application._id }) : null

  const settings = await getRecruitmentSettings(tenantId)
  const approvalLevel = settings.selectionApprovalLevel
  const needsApproval = approvalLevel !== SELECTION_APPROVAL_LEVEL.NONE

  const actorName = await getActorName(session)
  application.selectionStatus = needsApproval ? SELECTION_STATUS.SELECTION_APPROVAL_PENDING : SELECTION_STATUS.SELECTED
  application.activityLog.push({
    type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED,
    message: `Selected by ${actorName}${needsApproval ? ' — awaiting approval' : ''}`,
    comment: body.comments,
    actorName,
  })
  await application.save()

  const decision = await SelectionDecision.create({
    tenantId,
    applicationId: application._id, candidateId: application.candidateId, jobId: application.jobId,
    decision: SELECTION_DECISION_TYPE.SELECT,
    recommendedDesignationId: body.recommendedDesignationId || null,
    recommendedDepartmentId: body.recommendedDepartmentId || null,
    recommendedManagerId: body.recommendedManagerId || null,
    proposedJoiningDate: new Date(body.proposedJoiningDate),
    employmentType: body.employmentType || null,
    comments: body.comments || null,
    decidedBy: session.userId, decidedByName: actorName, decidedAt: new Date(),
    approvalStatus: needsApproval ? APPROVAL_STATUS.PENDING : APPROVAL_STATUS.NOT_REQUIRED,
    approvalLevel: needsApproval ? approvalLevel : null,
  })

  await logAction(session, {
    action: 'CANDIDATE_SELECTED', entityType: 'Application', entityId: application._id,
    description: `${application.applicationCode} marked Selected${needsApproval ? ' (pending approval)' : ''}`, req,
  })

  return ok({ application, decision, vacancy }, needsApproval ? 'Selection recorded — pending approval' : 'Candidate selected')
})
