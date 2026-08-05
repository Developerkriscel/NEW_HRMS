export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Resignation from '@/models/Resignation'
import Employee from '@/models/Employee'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)

  const resignation = await Resignation.findOne({ _id: params.id, tenantId })
    .populate('employee', 'firstName lastName employeeCode reportingManager')
    .populate('handoverEmployee', 'firstName lastName')
  if (!resignation) return fail('Resignation not found', 404)

  const isOwner = String(resignation.employee._id) === session.userId
  const isHandover = String(resignation.handoverEmployee?._id) === session.userId
  const isManager = session.role === 'MANAGER' && String(resignation.employee.reportingManager) === session.userId
  const isAdmin = ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)

  if (!isOwner && !isHandover && !isManager && !isAdmin) return fail('You do not have access to this resignation', 403)

  return ok(resignation)
})

// Manager: recommendation, handover employee/checklist, handover confirmations.
// Final hrDecision (APPROVED/REJECTED) is HR/Admin only.
export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const resignation = await Resignation.findOne({ _id: params.id, tenantId }).populate('employee', 'reportingManager')
  if (!resignation) return fail('Resignation not found', 404)

  const isManager = session.role === 'MANAGER' && String(resignation.employee.reportingManager) === session.userId
  const isAdmin = ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)
  if (!isManager && !isAdmin) return fail('Only the reporting manager or HR/Admin can update this resignation', 403)

  if (isManager) {
    if (body.managerRecommendation !== undefined) {
      resignation.managerRecommendation = body.managerRecommendation
      resignation.managerRecommendedAt = new Date()
      if (resignation.status === 'SUBMITTED') resignation.status = 'MANAGER_REVIEWED'
    }
    if (body.lastWorkingDate !== undefined) resignation.lastWorkingDate = body.lastWorkingDate
    if (body.handoverEmployeeId !== undefined) {
      const handover = await Employee.findOne({ _id: body.handoverEmployeeId, tenantId })
      if (!handover) return fail('Handover employee not found', 404)
      resignation.handoverEmployee = body.handoverEmployeeId
    }
    if (body.handoverChecklist !== undefined) resignation.handoverChecklist = body.handoverChecklist
    if (body.pendingTasksReviewed !== undefined) resignation.pendingTasksReviewed = body.pendingTasksReviewed
    if (body.workHandoverConfirmed !== undefined) resignation.workHandoverConfirmed = body.workHandoverConfirmed
    if (body.projectHandoverConfirmed !== undefined) resignation.projectHandoverConfirmed = body.projectHandoverConfirmed
    if (body.managerFinalRemarks !== undefined) resignation.managerFinalRemarks = body.managerFinalRemarks
  }

  if (isAdmin) {
    if (body.hrDecision !== undefined) {
      if (!['APPROVED', 'REJECTED'].includes(body.hrDecision)) return fail('hrDecision must be APPROVED or REJECTED', 400)
      resignation.status = body.hrDecision
      resignation.hrDecision = body.hrDecisionNote || ''
      resignation.hrDecisionAt = new Date()
      if (body.hrDecision === 'APPROVED') {
        await Employee.updateOne(
          { _id: resignation.employee._id || resignation.employee, tenantId },
          {
            status: 'NOTICE_PERIOD',
            resignationDate: resignation.resignationDate,
            lastWorkingDate: body.lastWorkingDate || resignation.lastWorkingDate || null,
            updatedBy: session.sub,
          }
        )
      }
    }
    for (const field of ['lastWorkingDate', 'handoverEmployeeId']) {
      if (field === 'handoverEmployeeId' && body[field] !== undefined) resignation.handoverEmployee = body[field]
      else if (body[field] !== undefined) resignation[field] = body[field]
    }
  }

  resignation.updatedBy = session.sub
  await resignation.save()

  await logAction(session, {
    action: 'RESIGNATION_UPDATED',
    entityType: 'Resignation',
    entityId: resignation._id,
    description: 'Resignation updated',
  })

  return ok(resignation, 'Resignation updated')
})
