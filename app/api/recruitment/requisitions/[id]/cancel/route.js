export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import {
  REQUISITION_ACCESS_ROLES, REQUISITION_ACTIVITY_TYPE, REQUISITION_TRANSITIONS,
  canManageRequisition,
} from '@/lib/recruitmentConstants'
import { populateRequisition, getActorName, getRequisitionSkills } from '@/lib/requisitionHelpers'
import JobRequisition from '@/models/JobRequisition'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, REQUISITION_ACCESS_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const requisition = await populateRequisition(JobRequisition.findOne({ _id: params.id, tenantId, deleted: false }))
  if (!requisition) throw new ApiError(404, 'Requisition not found', 'NOT_FOUND')
  if (!canManageRequisition(session, requisition)) {
    return fail('You do not have permission to cancel this requisition', 403, 'FORBIDDEN')
  }
  if (!REQUISITION_TRANSITIONS.cancel.from.includes(requisition.status)) {
    return fail('This requisition can no longer be cancelled', 400, 'INVALID_STATUS')
  }

  const actorName = await getActorName(session)
  requisition.status = REQUISITION_TRANSITIONS.cancel.to
  requisition.cancelledBy = session.userId
  requisition.cancelledAt = new Date()
  requisition.cancellationReason = body.reason?.trim() || null
  requisition.updatedBy = session.sub
  requisition.activityLog.push({
    type: REQUISITION_ACTIVITY_TYPE.CANCELLED,
    message: `Cancelled by ${actorName}`,
    actorId: session.userId,
    actorName,
    comment: body.reason?.trim() || null,
  })
  await requisition.save()

  await logAction(session, {
    action: 'REQUISITION_CANCELLED',
    entityType: 'JobRequisition',
    entityId: requisition._id,
    description: `Requisition ${requisition.requisitionCode} cancelled`,
    req,
  })

  const skills = await getRequisitionSkills(tenantId, requisition._id)
  return ok({ ...requisition.toObject(), ...skills }, 'Requisition cancelled')
})
