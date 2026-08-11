export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { COMPENSATION_VIEW_ROLES, canApproveCompensationStage, COMPENSATION_STATUS, APPROVAL_ACTION_STATUS } from '@/lib/compensationConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { recordApprovalAction } from '@/lib/compensationHelpers'
import CompensationProposal from '@/models/CompensationProposal'
import Application from '@/models/Application'
import Job from '@/models/Job'

// POST { suggestedCtc, comment } — "HR revises the proposal." Both fields
// are mandatory: a bare rejection tells HR nothing about what number would
// actually work.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, COMPENSATION_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!body.comment?.trim()) return fail('A comment is required when requesting a revision', 400, 'VALIDATION_ERROR')
  if (body.suggestedCtc == null || Number(body.suggestedCtc) <= 0) return fail('A suggested CTC is required when requesting a revision', 400, 'VALIDATION_ERROR')

  const proposal = await CompensationProposal.findOne({ _id: params.id, tenantId, deleted: false })
  if (!proposal) throw new ApiError(404, 'Compensation proposal not found', 'NOT_FOUND')
  if (proposal.status !== COMPENSATION_STATUS.PENDING_APPROVAL) return fail('This proposal is not pending approval', 400, 'INVALID_STATE')

  const job = await Job.findOne({ _id: proposal.jobId, tenantId, deleted: false })
  if (!canApproveCompensationStage(session, proposal.currentApprovalStage, job)) {
    return fail('You do not have permission to act on this compensation proposal', 403, 'FORBIDDEN')
  }

  const application = await Application.findOne({ _id: proposal.applicationId, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const actorName = await getActorName(session)
  await recordApprovalAction(proposal, { tenantId, session, actorName, comment: body.comment.trim(), status: APPROVAL_ACTION_STATUS.REVISION_REQUESTED })

  proposal.status = COMPENSATION_STATUS.REVISION_REQUESTED
  proposal.revisionComment = body.comment.trim()
  proposal.revisionSuggestedCtc = Number(body.suggestedCtc)
  proposal.currentApprovalStage = null
  await proposal.save()

  application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.UPDATED, message: `Revision requested on Compensation V${proposal.version} by ${actorName} — suggested ₹${body.suggestedCtc}`, actorName })
  await application.save()

  await logAction(session, { action: 'COMPENSATION_REVISION_REQUESTED', entityType: 'CompensationProposal', entityId: proposal._id, description: `Revision requested on compensation proposal V${proposal.version} for ${application.applicationCode}`, req })

  return ok({ application, proposal }, 'Revision requested — HR can now prepare a new version')
})
