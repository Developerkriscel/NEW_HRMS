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
    return fail('You do not have permission to approve requisitions', 403, 'FORBIDDEN')
  }

  const requisition = await populateRequisition(JobRequisition.findOne({ _id: params.id, tenantId, deleted: false }))
  if (!requisition) throw new ApiError(404, 'Requisition not found', 'NOT_FOUND')
  if (!REQUISITION_TRANSITIONS.approve.from.includes(requisition.status)) {
    return fail('Only requisitions pending approval can be approved', 400, 'INVALID_STATUS')
  }

  const actorName = await getActorName(session)
  requisition.status = REQUISITION_TRANSITIONS.approve.to
  requisition.approvedBy = session.userId
  requisition.approvedAt = new Date()
  requisition.approvalComment = body.comment || null
  requisition.updatedBy = session.sub
  requisition.activityLog.push({
    type: REQUISITION_ACTIVITY_TYPE.APPROVED,
    message: `Approved by ${actorName}`,
    actorId: session.userId,
    actorName,
    comment: body.comment || null,
  })
  await requisition.save()

  await logAction(session, {
    action: 'REQUISITION_APPROVED',
    entityType: 'JobRequisition',
    entityId: requisition._id,
    description: `Requisition ${requisition.requisitionCode} approved`,
    req,
  })

  const skills = await getRequisitionSkills(tenantId, requisition._id)
  return ok({ ...requisition.toObject(), ...skills }, 'Requisition approved')
})
