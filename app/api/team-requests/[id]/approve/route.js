export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import TeamRequest from '@/models/TeamRequest'
import Employee from '@/models/Employee'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const request = await TeamRequest.findOne({ _id: params.id, tenantId })
  if (!request) return fail('Request not found', 404)
  if (request.status !== 'PENDING') return fail('Only pending requests can be approved', 400)

  if (session.role === 'MANAGER') {
    const employee = await Employee.findOne({ _id: request.employee, tenantId })
    if (!employee || String(employee.reportingManager) !== session.userId) {
      return fail('You can only approve requests from your own direct reports', 403)
    }
  }

  request.status = 'APPROVED'
  request.reviewedBy = session.userId
  request.reviewerRemarks = body.remarks
  request.updatedBy = session.sub
  await request.save()

  if (request.type === 'SHIFT_CHANGE' && request.details?.requestedShiftId) {
    await Employee.updateOne({ _id: request.employee, tenantId }, { shift: request.details.requestedShiftId })
  }

  await logAction(session, {
    action: 'TEAM_REQUEST_APPROVED',
    entityType: 'TeamRequest',
    entityId: request._id,
    description: `${request.type} request approved`,
  })

  return ok(request, 'Request approved')
})
