export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Attendance from '@/models/Attendance'

export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const records = await Attendance.find({ tenantId, regularizationStatus: 'PENDING' })
    .populate('employee', 'firstName lastName employeeCode')

  return ok(records)
})
