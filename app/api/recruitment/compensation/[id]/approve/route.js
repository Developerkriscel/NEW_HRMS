export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { COMPENSATION_VIEW_ROLES, canApproveCompensationStage, COMPENSATION_STATUS } from '@/lib/compensationConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { advanceApprovalChain } from '@/lib/compensationHelpers'
import CompensationProposal from '@/models/CompensationProposal'
import Application from '@/models/Application'
import Job from '@/models/Job'

// POST { comment? } — approves at whichever stage the proposal is
// currently sitting at; if that's the last stage in the chain the proposal
// becomes fully APPROVED and the application flips readyForOffer.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, COMPENSATION_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const proposal = await CompensationProposal.findOne({ _id: params.id, tenantId, deleted: false })
  if (!proposal) throw new ApiError(404, 'Compensation proposal not found', 'NOT_FOUND')
  if (proposal.status !== COMPENSATION_STATUS.PENDING_APPROVAL) return fail('This proposal is not pending approval', 400, 'INVALID_STATE')

  const job = await Job.findOne({ _id: proposal.jobId, tenantId, deleted: false })
  if (!canApproveCompensationStage(session, proposal.currentApprovalStage, job)) {
    return fail('You do not have permission to approve this compensation proposal', 403, 'FORBIDDEN')
  }

  const application = await Application.findOne({ _id: proposal.applicationId, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const actorName = await getActorName(session)
  const fullyApproved = await advanceApprovalChain(proposal, { tenantId, session, actorName, comment: body.comment })
  await proposal.save()

  if (fullyApproved) {
    application.readyForOffer = true
    application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.UPDATED, message: `Compensation V${proposal.version} approved by ${actorName} — ready for offer`, actorName })
  } else {
    application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.UPDATED, message: `Compensation V${proposal.version} approved by ${actorName} — now awaiting ${proposal.currentApprovalStage.replace('_', ' ')} approval`, actorName })
  }
  await application.save()

  await logAction(session, { action: 'COMPENSATION_APPROVED', entityType: 'CompensationProposal', entityId: proposal._id, description: `Compensation proposal V${proposal.version} ${fullyApproved ? 'fully approved' : 'approved at a stage'} for ${application.applicationCode}`, req })

  return ok({ application, proposal }, fullyApproved ? 'Compensation approved — ready for offer' : 'Approved — moved to the next approval stage')
})
