export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Attendance from '@/models/Attendance'

export const GET = withApi(async () => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const today = new Date(new Date().toDateString())
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const attendance = await Attendance.findOne({ employee: session.userId, date: { $gte: today, $lt: tomorrow }, tenantId })
  return ok(attendance || null)
})
