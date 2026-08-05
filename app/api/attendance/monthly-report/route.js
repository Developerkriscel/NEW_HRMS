export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Attendance from '@/models/Attendance'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)

  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)

  const records = await Attendance.find({ tenantId, date: { $gte: monthStart, $lte: monthEnd } })

  const summary = {
    presentDays: records.filter((r) => r.status === 'PRESENT' || r.status === 'WFH').length,
    absentDays: records.filter((r) => r.status === 'ABSENT').length,
    halfDays: records.filter((r) => r.status === 'HALF_DAY').length,
    lateCount: records.filter((r) => r.lateMark).length,
    totalOvertimeMinutes: records.reduce((sum, r) => sum + (r.overtimeMinutes || 0), 0),
  }

  return ok(summary)
})
