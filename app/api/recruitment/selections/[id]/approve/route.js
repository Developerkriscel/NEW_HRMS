export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { SELECTION_VIEW_ROLES, canApproveSelection, APPROVAL_STATUS, SELECTION_STATUS } from '@/lib/selectionConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import SelectionDecision from '@/models/SelectionDecision'
import Application from '@/models/Application'
import Job from '@/models/Job'

// POST { comment? } — :id is the pending SELECT selection_decisions row.
// Who can approve depends on the tenant's configured selectionApprovalLevel
// (see lib/selectionConstants.js#canApproveSelection) — Company Admin/Super
// Admin can always act as the top of any chain.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, SELECTION_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const decision = await SelectionDecision.findOne({ _id: params.id, tenantId })
  if (!decision) throw new ApiError(404, 'Selection decision not found', 'NOT_FOUND')
  if (decision.approvalStatus !== APPROVAL_STATUS.PENDING) return fail('This selection is not pending approval', 400, 'INVALID_STATE')

  const job = await Job.findOne({ _id: decision.jobId, tenantId, deleted: false })
  if (!canApproveSelection(session, decision.approvalLevel, job)) return fail('You do not have permission to approve this selection', 403, 'FORBIDDEN')

  const application = await Application.findOne({ _id: decision.applicationId, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const actorName = await getActorName(session)
  decision.approvalStatus = APPROVAL_STATUS.APPROVED
  decision.approvedBy = session.userId
  decision.approvedByName = actorName
  decision.approvedAt = new Date()
  decision.approvalComment = body.comment || null
  await decision.save()

  application.selectionStatus = SELECTION_STATUS.SELECTION_APPROVED
  application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED, message: `Selection approved by ${actorName}`, comment: body.comment, actorName })
  await application.save()

  await logAction(session, { action: 'SELECTION_APPROVED', entityType: 'SelectionDecision', entityId: decision._id, description: `Selection approved for application ${application.applicationCode}`, req })

  return ok({ application, decision }, 'Selection approved')
})
