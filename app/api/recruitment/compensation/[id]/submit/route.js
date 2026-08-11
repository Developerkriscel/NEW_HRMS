export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { COMPENSATION_VIEW_ROLES, canManageCompensation, COMPENSATION_STATUS } from '@/lib/compensationConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { getRecruitmentSettings } from '@/lib/selectionHelpers'
import { startApprovalChain } from '@/lib/compensationHelpers'
import CompensationProposal from '@/models/CompensationProposal'
import Application from '@/models/Application'

// POST — DRAFT -> PENDING_APPROVAL (or straight to APPROVED when the tenant
// has no compensation approval configured). Routes through whichever
// approval chain lib/selectionHelpers.getRecruitmentSettings currently has
// for compensationApprovalLevel — "configurable approval levels".
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, COMPENSATION_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  if (!canManageCompensation(session)) return fail('You do not have permission to submit compensation for approval', 403, 'FORBIDDEN')

  const proposal = await CompensationProposal.findOne({ _id: params.id, tenantId, deleted: false })
  if (!proposal) throw new ApiError(404, 'Compensation proposal not found', 'NOT_FOUND')
  if (![COMPENSATION_STATUS.DRAFT, COMPENSATION_STATUS.REVISION_REQUESTED].includes(proposal.status)) {
    return fail(`Cannot submit a proposal that is ${proposal.status.toLowerCase().replace('_', ' ')}`, 400, 'INVALID_STATE')
  }

  const application = await Application.findOne({ _id: proposal.applicationId, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const settings = await getRecruitmentSettings(tenantId)
  const actorName = await getActorName(session)
  proposal.submittedAt = new Date()
  await startApprovalChain(proposal, settings.compensationApprovalLevel, { tenantId, session, actorName })
  await proposal.save()

  application.activityLog.push({
    type: ACTIVITY_ENTRY_TYPE.UPDATED,
    message: `Compensation proposal V${proposal.version} submitted${proposal.status === COMPENSATION_STATUS.APPROVED ? ' and approved (no approval required)' : ' for approval'} by ${actorName}`,
    actorName,
  })
  if (proposal.status === COMPENSATION_STATUS.APPROVED) application.readyForOffer = true
  await application.save()

  await logAction(session, { action: 'COMPENSATION_SUBMITTED', entityType: 'CompensationProposal', entityId: proposal._id, description: `Compensation proposal V${proposal.version} submitted for ${application.applicationCode}`, req })

  return ok({ application, proposal }, proposal.status === COMPENSATION_STATUS.APPROVED ? 'Compensation approved — ready for offer' : 'Compensation submitted for approval')
})
