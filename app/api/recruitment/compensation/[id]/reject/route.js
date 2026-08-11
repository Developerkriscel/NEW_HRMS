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

// POST { reason } — a hard stop for this version; HR must prepare a new
// proposal (V2, V3, ...) from scratch, this one is never reopened.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, COMPENSATION_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!body.reason?.trim()) return fail('A rejection reason is required', 400, 'VALIDATION_ERROR')

  const proposal = await CompensationProposal.findOne({ _id: params.id, tenantId, deleted: false })
  if (!proposal) throw new ApiError(404, 'Compensation proposal not found', 'NOT_FOUND')
  if (proposal.status !== COMPENSATION_STATUS.PENDING_APPROVAL) return fail('This proposal is not pending approval', 400, 'INVALID_STATE')

  const job = await Job.findOne({ _id: proposal.jobId, tenantId, deleted: false })
  if (!canApproveCompensationStage(session, proposal.currentApprovalStage, job)) {
    return fail('You do not have permission to reject this compensation proposal', 403, 'FORBIDDEN')
  }

  const application = await Application.findOne({ _id: proposal.applicationId, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const actorName = await getActorName(session)
  await recordApprovalAction(proposal, { tenantId, session, actorName, comment: body.reason.trim(), status: APPROVAL_ACTION_STATUS.REJECTED })

  proposal.status = COMPENSATION_STATUS.REJECTED
  proposal.rejectionReason = body.reason.trim()
  proposal.currentApprovalStage = null
  await proposal.save()

  application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.UPDATED, message: `Compensation V${proposal.version} rejected by ${actorName} — ${body.reason.trim()}`, actorName })
  await application.save()

  await logAction(session, { action: 'COMPENSATION_REJECTED', entityType: 'CompensationProposal', entityId: proposal._id, description: `Compensation proposal V${proposal.version} rejected for ${application.applicationCode}: ${body.reason}`, req })

  return ok({ application, proposal }, 'Compensation proposal rejected')
})
