export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Attendance from '@/models/Attendance'
import Employee from '@/models/Employee'
import Tenant from '@/models/Tenant'

const CHECK_IN_SOURCES = ['WEB', 'MOBILE', 'GPS', 'BIOMETRIC', 'QR_CODE', 'FACE_RECOGNITION', 'MANUAL', 'WFH']
const DEFAULT_LATE_GRACE_MINUTES = 15

function todayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' })
}

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
  
  const [employee, tenantDoc] = await Promise.all([
    Employee.findOne({ _id: session.userId, tenantId, deleted: false }).populate('shift'),
    Tenant.findById(tenantId),
  ])
  const assignedShift = employee?.shift?.active !== false ? employee?.shift : null
  const shiftWorkingDays = Array.isArray(assignedShift?.workingDays) ? assignedShift.workingDays : null
  if (shiftWorkingDays?.length && !shiftWorkingDays.includes(todayName())) {
    return fail(`Today is weekly off for your assigned shift (${assignedShift.name})`, 400)
  }

  const officeStartTime = assignedShift?.startTime || tenantDoc?.hrSettings?.officeStartTime || '09:00'
  const graceMinutes = assignedShift?.gracePeriodMinutes ?? DEFAULT_LATE_GRACE_MINUTES
  const [startHour, startMin] = officeStartTime.split(':').map(Number)
  
  const expectedStartTime = new Date(now)
  expectedStartTime.setHours(startHour, startMin, 0, 0)
  const graceTime = new Date(expectedStartTime.getTime() + graceMinutes * 60000)
  
  const isLate = now > graceTime

  if (!attendance) {
    attendance = new Attendance({ employee: session.userId, date: today, tenantId, createdBy: session.sub })
  }
  attendance.checkInTime = now
  
  if (body.location) {
    attendance.checkInLatitude = body.location.lat
    attendance.checkInLongitude = body.location.lng
    attendance.checkInAccuracy = body.location.accuracy
  } else {
    attendance.checkInLatitude = body.latitude
    attendance.checkInLongitude = body.longitude
  }
  
  if (body.photo) {
    attendance.checkInPhoto = body.photo
  }

  // Determine verification status
  if (attendance.checkInPhoto && attendance.checkInLatitude) {
    attendance.verificationStatus = 'VERIFIED'
  } else if (attendance.checkInPhoto) {
    attendance.verificationStatus = 'CAMERA_VERIFIED'
  } else if (attendance.checkInLatitude) {
    attendance.verificationStatus = 'LOCATION_VERIFIED'
  }

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
