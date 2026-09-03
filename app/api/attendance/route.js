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

  const dateParam = searchParams.get('date')
  let date;
  if (dateParam) {
    const [y, m, d] = dateParam.split('-')
    date = new Date(y, m - 1, d)
  } else {
    date = new Date(new Date().toDateString())
  }

  const records = await Attendance.find({ tenantId, date }).populate('employee', 'firstName lastName employeeCode')

  const summary = {
    present: records.filter((r) => r.status === 'PRESENT' || r.status === 'WFH').length,
    absent: records.filter((r) => r.status === 'ABSENT').length,
    late: records.filter((r) => r.lateMark).length,
  }

  return ok({ records, summary })
})
