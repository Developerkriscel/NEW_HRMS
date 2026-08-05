export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import LeaveRequest from '@/models/LeaveRequest'
import LeaveBalance from '@/models/LeaveBalance'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const remarks = searchParams.get('remarks')

  const leaveRequest = await LeaveRequest.findOne({ _id: params.id, tenantId })
  if (!leaveRequest) return fail('Leave request not found', 404)
  if (leaveRequest.status !== 'PENDING') {
    return fail('Only pending leave requests can be approved', 400)
  }

  leaveRequest.status = 'APPROVED'
  leaveRequest.approverRemarks = remarks
  leaveRequest.updatedBy = session.sub
  await leaveRequest.save()

  const balance = await LeaveBalance.findOne({
    employee: leaveRequest.employee,
    leaveType: leaveRequest.leaveType,
    year: leaveRequest.startDate.getFullYear(),
  })
  if (balance) {
    balance.usedDays += leaveRequest.numberOfDays
    await balance.save()
  }

  await logAction(session, {
    action: 'LEAVE_APPROVED',
    entityType: 'LeaveRequest',
    entityId: leaveRequest._id,
    description: 'Leave request approved',
  })

  return ok(leaveRequest, 'Leave approved')
})
