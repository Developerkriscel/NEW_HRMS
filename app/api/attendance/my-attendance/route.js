export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Attendance from '@/models/Attendance'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)

  const now = new Date()
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1)
  const from = searchParams.get('from') ? new Date(searchParams.get('from')) : defaultFrom
  const to = searchParams.get('to') ? new Date(searchParams.get('to')) : now
  if (searchParams.get('to')) to.setDate(to.getDate() + 1)

  const records = await Attendance.find({
    employee: session.userId,
    tenantId,
    date: { $gte: from, $lt: to },
  }).sort({ date: -1 })

  return ok(records)
})
