export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import LeaveRequest from '@/models/LeaveRequest'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))

  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)

  const leaves = await LeaveRequest.find({
    tenantId,
    status: 'APPROVED',
    startDate: { $lte: monthEnd },
    endDate: { $gte: monthStart },
  }).populate('employee', 'firstName lastName')

  return ok(leaves)
})
