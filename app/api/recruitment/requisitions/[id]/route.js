export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import {
  REQUISITION_ACCESS_ROLES, REQUISITION_ACTIVITY_TYPE, REQUISITION_EDITABLE_STATUSES,
  canManageRequisition,
} from '@/lib/recruitmentConstants'
import { validateAlways } from '@/lib/recruitmentValidation'
import {
  populateRequisition, getActorName, syncRequisitionSkills, getRequisitionSkills,
  assertReplacementEmployeeValid, applyWritableFields,
} from '@/lib/requisitionHelpers'
import JobRequisition from '@/models/JobRequisition'

async function loadRequisition(tenantId, id) {
  const requisition = await populateRequisition(JobRequisition.findOne({ _id: id, tenantId, deleted: false }))
  if (!requisition) throw new ApiError(404, 'Requisition not found', 'NOT_FOUND')
  return requisition
}

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, REQUISITION_ACCESS_ROLES)
  const tenantId = requireTenantId(session)

  const requisition = await loadRequisition(tenantId, params.id)
  if (!canManageRequisition(session, requisition)) {
    return fail('You do not have permission to view this requisition', 403, 'FORBIDDEN')
  }

  const skills = await getRequisitionSkills(tenantId, requisition._id)
  return ok({ ...requisition.toObject(), ...skills })
})

export const PATCH = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, REQUISITION_ACCESS_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const requisition = await loadRequisition(tenantId, params.id)
  if (!canManageRequisition(session, requisition)) {
    return fail('You do not have permission to edit this requisition', 403, 'FORBIDDEN')
  }
  // Rule 2 — an Approved (or later-stage) requisition is read-only.
  if (!REQUISITION_EDITABLE_STATUSES.includes(requisition.status)) {
    return fail('This requisition is no longer editable', 400, 'NOT_EDITABLE')
  }

  const merged = { ...requisition.toObject(), ...body }
  const fieldErrors = validateAlways(merged)
  if (Object.keys(fieldErrors).length) return fail('Please fix the highlighted fields', 400, 'VALIDATION_ERROR', { errors: fieldErrors })

  if (body.replacementEmployee) await assertReplacementEmployeeValid(tenantId, body.replacementEmployee)

  applyWritableFields(requisition, body)
  requisition.updatedBy = session.sub
  requisition.activityLog.push({
    type: REQUISITION_ACTIVITY_TYPE.UPDATED,
    message: requisition.status === 'DRAFT' ? 'Draft updated' : 'Requisition updated',
    actorId: session.userId,
    actorName: await getActorName(session),
  })
  await requisition.save()

  if (body.requiredSkills !== undefined || body.preferredSkills !== undefined) {
    await syncRequisitionSkills(tenantId, requisition._id, body.requiredSkills, body.preferredSkills)
  }

  await logAction(session, {
    action: 'REQUISITION_UPDATED',
    entityType: 'JobRequisition',
    entityId: requisition._id,
    description: `Requisition ${requisition.requisitionCode} updated`,
    req,
  })

  const populated = await loadRequisition(tenantId, params.id)
  const skills = await getRequisitionSkills(tenantId, requisition._id)
  return ok({ ...populated.toObject(), ...skills }, 'Requisition updated')
})
