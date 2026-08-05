export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Attendance from '@/models/Attendance'

const CHECK_IN_SOURCES = ['WEB', 'MOBILE', 'GPS', 'BIOMETRIC', 'QR_CODE', 'FACE_RECOGNITION', 'MANUAL', 'WFH']
const LATE_HOUR = 10
const LATE_MINUTE = 15

function startOfToday() {
  return new Date(new Date().toDateString())
}

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const today = startOfToday()
  const now = new Date()

  let source = (body.source || 'WEB').toUpperCase()
  if (!CHECK_IN_SOURCES.includes(source)) {
    return fail('Invalid check-in source', 400)
  }

  let attendance = await Attendance.findOne({ employee: session.userId, date: today, tenantId })
  if (attendance?.checkInTime) {
    return fail('You have already checked in today', 400)
  }

  // Geo-fence validation is intentionally a no-op — Branch.geoFenceRadius
  // exists but no haversine-distance enforcement is implemented anywhere
  // in this system, matching the original.
  const isLate = now.getHours() > LATE_HOUR || (now.getHours() === LATE_HOUR && now.getMinutes() > LATE_MINUTE)

  if (!attendance) {
    attendance = new Attendance({ employee: session.userId, date: today, tenantId, createdBy: session.sub })
  }
  attendance.checkInTime = now
  attendance.checkInLatitude = body.latitude
  attendance.checkInLongitude = body.longitude
  attendance.checkInSource = source
  attendance.lateMark = isLate
  attendance.status = 'PRESENT'
  attendance.updatedBy = session.sub
  await attendance.save()

  return ok({
    id: attendance._id,
    checkInTime: attendance.checkInTime,
    lateMark: attendance.lateMark,
    date: attendance.date,
    message: isLate ? 'Checked in (Late)' : 'Checked in successfully',
  })
})
