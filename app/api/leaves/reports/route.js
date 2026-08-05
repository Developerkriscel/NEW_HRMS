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
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)

  const requests = await LeaveRequest.find({
    tenantId,
    status: 'APPROVED',
    startDate: { $lte: monthEnd },
    endDate: { $gte: monthStart },
  })
    .populate('leaveType', 'name')
    .populate('employee', 'firstName lastName department')
    .populate({ path: 'employee', populate: { path: 'department', select: 'name' } })

  const byType = {}
  const byDepartment = {}
  let totalDays = 0

  for (const r of requests) {
    const typeName = r.leaveType?.name || 'Unknown'
    const deptName = r.employee?.department?.name || 'Unassigned'
    byType[typeName] = (byType[typeName] || 0) + r.numberOfDays
    byDepartment[deptName] = (byDepartment[deptName] || 0) + r.numberOfDays
    totalDays += r.numberOfDays
  }

  return ok({
    totalDays,
    totalRequests: requests.length,
    byType: Object.entries(byType).map(([name, days]) => ({ name, days })),
    byDepartment: Object.entries(byDepartment).map(([name, days]) => ({ name, days })),
  })
})
