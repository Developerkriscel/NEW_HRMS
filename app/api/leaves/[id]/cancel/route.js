export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import LeaveRequest from '@/models/LeaveRequest'
import LeaveBalance from '@/models/LeaveBalance'
import Employee from '@/models/Employee'

export const PUT = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)

  const leaveRequest = await LeaveRequest.findOne({ _id: params.id, tenantId })
  if (!leaveRequest) return fail('Leave request not found', 404)

  const isOwner = String(leaveRequest.employee) === session.userId
  if (!isOwner) {
    // A Manager may cancel an already-approved leave request for one of
    // their own direct reports — but only while the leave hasn't started
    // yet. This is the "cancel approved leave, only with permission" rule:
    // the permission is the reporting relationship + the future-dated
    // restriction, not a separately granted toggle.
    if (session.role !== 'MANAGER') {
      throw new ApiError(403, 'You can only cancel your own leave requests', 'FORBIDDEN')
    }
    const employee = await Employee.findOne({ _id: leaveRequest.employee, tenantId })
    if (!employee || String(employee.reportingManager) !== session.userId) {
      throw new ApiError(403, 'You can only cancel leave for your own direct reports', 'FORBIDDEN')
    }
    if (leaveRequest.status !== 'APPROVED') {
      return fail('Only approved leave can be cancelled by a manager', 400)
    }
    if (leaveRequest.startDate <= new Date()) {
      return fail('Cannot cancel leave that has already started', 400)
    }
  }
  if (leaveRequest.status === 'REJECTED') {
    return fail('Cannot cancel a rejected leave request', 400)
  }

  if (leaveRequest.status === 'APPROVED') {
    const balance = await LeaveBalance.findOne({
      employee: leaveRequest.employee,
      leaveType: leaveRequest.leaveType,
      year: leaveRequest.startDate.getFullYear(),
    })
    if (balance) {
      balance.usedDays = Math.max(0, balance.usedDays - leaveRequest.numberOfDays)
      await balance.save()
    }
  }

  leaveRequest.status = 'CANCELLED'
  leaveRequest.updatedBy = session.sub
  await leaveRequest.save()

  await logAction(session, {
    action: 'LEAVE_CANCELLED',
    entityType: 'LeaveRequest',
    entityId: leaveRequest._id,
    description: 'Leave request cancelled',
  })

  return ok(leaveRequest, 'Leave cancelled')
})
