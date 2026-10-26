export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Attendance from '@/models/Attendance'
import '@/models/Employee'

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
  const query = { tenantId, date: { $gte: monthStart, $lte: monthEnd } }
  if (employeeId && employeeId !== 'all') query.employee = employeeId

  const records = await Attendance.find(query)
    .populate('employee', 'firstName lastName employeeCode')
    .sort({ date: -1 })

  const summary = {
    presentDays: records.filter((r) => r.status === 'PRESENT' || r.status === 'WFH').length,
    absentDays: records.filter((r) => r.status === 'ABSENT').length,
    halfDays: records.filter((r) => r.status === 'HALF_DAY').length,
    lateCount: records.filter((r) => r.lateMark).length,
    totalOvertimeMinutes: records.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0),
  }

  return ok({
    ...summary,
    records: records.map((record) => ({
      _id: record._id,
      date: record.date,
      employeeId: record.employee?._id || record.employee,
      employeeName: record.employee ? `${record.employee.firstName || ''} ${record.employee.lastName || ''}`.trim() : 'Unknown Employee',
      employeeCode: record.employee?.employeeCode || '',
      checkInTime: record.checkInTime,
      checkOutTime: record.checkOutTime,
      status: record.status,
      lateMark: record.lateMark,
      workingMinutes: record.workingMinutes || 0,
      overtimeMinutes: record.overtimeMinutes || 0,
    })),
  })
})
