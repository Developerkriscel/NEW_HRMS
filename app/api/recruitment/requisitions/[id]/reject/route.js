export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import {
  REQUISITION_ACCESS_ROLES, REQUISITION_ACTIVITY_TYPE, REQUISITION_TRANSITIONS,
  canApproveOrReject,
} from '@/lib/recruitmentConstants'
import { populateRequisition, getActorName, getRequisitionSkills } from '@/lib/requisitionHelpers'
import JobRequisition from '@/models/JobRequisition'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, REQUISITION_ACCESS_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canApproveOrReject(session)) {
    return fail('You do not have permission to reject requisitions', 403, 'FORBIDDEN')
  }
  // Mandatory per spec ("Rejection Reason *").
  if (!body.reason || !body.reason.trim()) {
    return fail('A rejection reason is required', 400, 'VALIDATION_ERROR', { errors: { reason: 'Rejection reason is required' } })
  }

  const requisition = await populateRequisition(JobRequisition.findOne({ _id: params.id, tenantId, deleted: false }))
  if (!requisition) throw new ApiError(404, 'Requisition not found', 'NOT_FOUND')
  if (!REQUISITION_TRANSITIONS.reject.from.includes(requisition.status)) {
    return fail('Only requisitions pending approval can be rejected', 400, 'INVALID_STATUS')
  }

  const actorName = await getActorName(session)
  requisition.status = REQUISITION_TRANSITIONS.reject.to
  requisition.rejectedBy = session.userId
  requisition.rejectedAt = new Date()
  requisition.rejectionReason = body.reason.trim()
  requisition.updatedBy = session.sub
  requisition.activityLog.push({
    type: REQUISITION_ACTIVITY_TYPE.REJECTED,
    message: `Rejected by ${actorName}`,
    actorId: session.userId,
    actorName,
    comment: body.reason.trim(),
  })
  await requisition.save()

  await logAction(session, {
    action: 'REQUISITION_REJECTED',
    entityType: 'JobRequisition',
    entityId: requisition._id,
    description: `Requisition ${requisition.requisitionCode} rejected`,
    reason: body.reason.trim(),
    req,
  })

  const skills = await getRequisitionSkills(tenantId, requisition._id)
  return ok({ ...requisition.toObject(), ...skills }, 'Requisition rejected')
})
