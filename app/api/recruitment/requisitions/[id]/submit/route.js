export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import {
  REQUISITION_ACCESS_ROLES, REQUISITION_ACTIVITY_TYPE, REQUISITION_TRANSITIONS,
  canManageRequisition,
} from '@/lib/recruitmentConstants'
import { validateForSubmit } from '@/lib/recruitmentValidation'
import { populateRequisition, getActorName, getRequisitionSkills } from '@/lib/requisitionHelpers'
import JobRequisition from '@/models/JobRequisition'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, REQUISITION_ACCESS_ROLES)
  const tenantId = requireTenantId(session)

  const requisition = await populateRequisition(JobRequisition.findOne({ _id: params.id, tenantId, deleted: false }))
  if (!requisition) throw new ApiError(404, 'Requisition not found', 'NOT_FOUND')
  if (!canManageRequisition(session, requisition)) {
    return fail('You do not have permission to submit this requisition', 403, 'FORBIDDEN')
  }
  if (!REQUISITION_TRANSITIONS.submit.from.includes(requisition.status)) {
    return fail('Only draft requisitions can be submitted for approval', 400, 'INVALID_STATUS')
  }

  // Rule 1 — validated against the requisition as currently saved, plus its
  // synced skill rows, not the (empty) request body.
  const skills = await getRequisitionSkills(tenantId, requisition._id)
  const fieldErrors = validateForSubmit({ ...requisition.toObject(), ...skills })
  if (Object.keys(fieldErrors).length) {
    return fail('This requisition is missing required fields', 400, 'VALIDATION_ERROR', { errors: fieldErrors })
  }

  const actorName = await getActorName(session)
  requisition.status = REQUISITION_TRANSITIONS.submit.to
  requisition.submittedAt = new Date()
  requisition.updatedBy = session.sub
  requisition.activityLog.push({
    type: REQUISITION_ACTIVITY_TYPE.SUBMITTED,
    message: `Submitted for approval by ${actorName}`,
    actorId: session.userId,
    actorName,
  })
  await requisition.save()

  await logAction(session, {
    action: 'REQUISITION_SUBMITTED',
    entityType: 'JobRequisition',
    entityId: requisition._id,
    description: `Requisition ${requisition.requisitionCode} submitted for approval`,
    req,
  })

  return ok({ ...requisition.toObject(), ...skills }, 'Requisition submitted for approval')
})
