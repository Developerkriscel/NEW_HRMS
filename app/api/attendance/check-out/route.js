export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Attendance from '@/models/Attendance'

function startOfToday() {
  return new Date(new Date().toDateString())
}

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const today = startOfToday()
  const now = new Date()

  const attendance = await Attendance.findOne({ employee: session.userId, date: today, tenantId })
  if (!attendance || !attendance.checkInTime) {
    return fail('No check-in found for today', 400)
  }
  if (attendance.checkOutTime) {
    return fail('You have already checked out today', 400)
  }

  const workMinutes = Math.round((now.getTime() - attendance.checkInTime.getTime()) / 60000)
  const workHours = Math.floor(workMinutes / 60)

  if (workHours < 2) {
    attendance.status = 'ABSENT'
  } else if (workHours < 4) {
    attendance.status = 'HALF_DAY'
  }
  // workHours >= 4 leaves status unchanged (PRESENT from check-in)

  const overtimeMinutes = workHours > 9 ? workMinutes - 540 : 0

  attendance.checkOutTime = now
  attendance.checkOutLatitude = body.latitude
  attendance.checkOutLongitude = body.longitude
  attendance.workingMinutes = workMinutes
  attendance.overtimeMinutes = overtimeMinutes
  attendance.updatedBy = session.sub
  await attendance.save()

  return ok({
    id: attendance._id,
    checkOutTime: attendance.checkOutTime,
    workingHours: (workMinutes / 60).toFixed(1),
    overtimeMinutes,
    message: 'Checked out successfully',
  })
})
