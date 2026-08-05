export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Attendance from '@/models/Attendance'

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const date = new Date(new Date(body.date).toDateString())

  let attendance = await Attendance.findOne({ employee: session.userId, date, tenantId })
  if (!attendance) {
    attendance = new Attendance({ employee: session.userId, date, tenantId, createdBy: session.sub })
  }

  attendance.regularizationRequested = true
  attendance.regularizationCheckIn = body.checkInTime ? new Date(body.checkInTime) : null
  attendance.regularizationCheckOut = body.checkOutTime ? new Date(body.checkOutTime) : null
  attendance.regularizationReason = body.reason
  attendance.regularizationStatus = 'PENDING'
  attendance.updatedBy = session.sub
  await attendance.save()

  await logAction(session, {
    action: 'REGULARIZATION_APPLIED',
    entityType: 'Attendance',
    entityId: attendance._id,
    description: `Regularization requested for ${date.toDateString()}`,
  })

  return ok(attendance, 'Regularization request submitted')
})
