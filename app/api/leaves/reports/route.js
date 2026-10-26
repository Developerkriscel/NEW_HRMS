export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import LeaveRequest from '@/models/LeaveRequest'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)

  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const employeeId = searchParams.get('employeeId')
  const monthStart = from ? new Date(`${from}T00:00:00`) : new Date(year, month - 1, 1)
  const monthEnd = to ? new Date(`${to}T23:59:59.999`) : new Date(year, month, 0, 23, 59, 59, 999)

  const query = {
    tenantId,
    status: 'APPROVED',
    startDate: { $lte: monthEnd },
    endDate: { $gte: monthStart },
  }
  if (employeeId && employeeId !== 'all') query.employee = employeeId
  const requests = await LeaveRequest.find(query)
    .populate('leaveType', 'name')
    .populate('employee', 'firstName lastName employeeCode department')
    .populate({ path: 'employee', populate: { path: 'department', select: 'name' } })

  const byType = {}
  const byDepartment = {}
  let totalDays = 0

  for (const r of requests) {
    const overlapStart = new Date(Math.max(new Date(r.startDate).getTime(), monthStart.getTime()))
    const overlapEnd = new Date(Math.min(new Date(r.endDate).getTime(), monthEnd.getTime()))
    const overlapDays = Math.max(1, Math.floor((overlapEnd - overlapStart) / 86400000) + 1)
    const typeName = r.leaveType?.name || 'Unknown'
    const deptName = r.employee?.department?.name || 'Unassigned'
    byType[typeName] = (byType[typeName] || 0) + overlapDays
    byDepartment[deptName] = (byDepartment[deptName] || 0) + overlapDays
    totalDays += overlapDays
  }

  return ok({
    totalDays,
    totalRequests: requests.length,
    byType: Object.entries(byType).map(([name, days]) => ({ name, days })),
    byDepartment: Object.entries(byDepartment).map(([name, days]) => ({ name, days })),
    records: requests.map((request) => ({
      _id: request._id,
      employeeId: request.employee?._id || request.employee,
      employeeName: request.employee ? `${request.employee.firstName || ''} ${request.employee.lastName || ''}`.trim() : 'Unknown Employee',
      employeeCode: request.employee?.employeeCode || '',
      leaveType: request.leaveType?.name || 'Leave',
      startDate: request.startDate,
      endDate: request.endDate,
      numberOfDays: Math.max(1, Math.floor((Math.min(new Date(request.endDate).getTime(), monthEnd.getTime()) - Math.max(new Date(request.startDate).getTime(), monthStart.getTime())) / 86400000) + 1),
      status: request.status,
    })),
  })
})
