export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import LeaveRequest from '@/models/LeaveRequest'
import LeaveBalance from '@/models/LeaveBalance'
import Employee from '@/models/Employee'

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const startDate = new Date(body.startDate)
  const endDate = new Date(body.endDate)
  if (endDate < startDate) {
    return fail('End date must be after or equal to start date', 400)
  }

  const overlapping = await LeaveRequest.findOne({
    employee: session.userId,
    tenantId,
    status: { $nin: ['REJECTED', 'CANCELLED'] },
    startDate: { $lte: endDate },
    endDate: { $gte: startDate },
  })
  if (overlapping) {
    return fail('You already have a leave request overlapping these dates', 400)
  }

  const days = Math.floor((endDate - startDate) / 86400000) + 1

  const balance = await LeaveBalance.findOne({
    employee: session.userId,
    leaveType: body.leaveTypeId,
    year: startDate.getFullYear(),
  })
  if (balance) {
    const available = balance.getAvailableDays()
    if (available < days) {
      return fail(`Insufficient leave balance. Available: ${available}, Requested: ${days}`, 400)
    }
  }
  // If no balance row exists at all, the request is allowed through with no
  // validation — matching the original system, which never auto-creates
  // balance rows.

  const employee = await Employee.findById(session.userId)

  const isSelfApprove = ['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role) && !employee?.reportingManager;

  const leaveRequest = await LeaveRequest.create({
    employee: session.userId,
    leaveType: body.leaveTypeId,
    startDate,
    endDate,
    numberOfDays: days,
    reason: body.reason,
    halfDay: body.halfDay ?? false,
    halfDayType: body.halfDayType || null,
    status: 'PENDING',
    approvedBy: isSelfApprove ? session.userId : (employee?.reportingManager || null),
    tenantId,
    createdBy: session.sub,
  })

  await logAction(session, {
    action: 'LEAVE_APPLIED',
    entityType: 'LeaveRequest',
    entityId: leaveRequest._id,
    description: `Leave applied from ${startDate.toDateString()} to ${endDate.toDateString()}`,
  })

  return ok(leaveRequest, 'Leave request submitted', 201)
})
