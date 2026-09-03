export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Attendance from '@/models/Attendance'
import Employee from '@/models/Employee'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
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

  const reports = await Employee.find({ reportingManager: session.userId, tenantId, deleted: false }).limit(200)
  const result = []
  for (const emp of reports) {
    const attendance = await Attendance.findOne({ employee: emp._id, date, tenantId }).lean()
    if (attendance) {
      result.push({ ...attendance, name: emp.getFullName(), employeeId: emp._id })
    } else {
      result.push({
        employeeId: emp._id,
        name: emp.getFullName(),
        status: 'ABSENT',
      })
    }
  }

  return ok(result)
})
