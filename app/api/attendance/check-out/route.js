export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Attendance from '@/models/Attendance'
import Employee from '@/models/Employee'
import Tenant from '@/models/Tenant'

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

  // Calculate breaks total
  let totalBreakMinutes = 0
  if (attendance.breaks && attendance.breaks.length > 0) {
    attendance.breaks.forEach(b => {
      if (b.end) {
        totalBreakMinutes += b.duration || Math.round((b.end.getTime() - b.start.getTime()) / 60000)
      } else {
        // Close ongoing break
        b.end = now
        b.duration = Math.round((b.end.getTime() - b.start.getTime()) / 60000)
        totalBreakMinutes += b.duration
      }
    })
  }

  const elapsedMinutes = Math.round((now.getTime() - attendance.checkInTime.getTime()) / 60000)
  const workMinutes = Math.max(0, elapsedMinutes - totalBreakMinutes)
  const workHours = Math.floor(workMinutes / 60)

  if (workHours < 2) {
    attendance.status = 'ABSENT'
  } else if (workHours < 4) {
    attendance.status = 'HALF_DAY'
  }

  const [employee, tenantDoc] = await Promise.all([
    Employee.findOne({ _id: session.userId, tenantId, deleted: false }).populate('shift'),
    Tenant.findById(tenantId),
  ])
  const assignedShift = employee?.shift?.active !== false ? employee?.shift : null
  const officeStartTime = assignedShift?.startTime || tenantDoc?.hrSettings?.officeStartTime || '09:00'
  const officeEndTime = assignedShift?.endTime || tenantDoc?.hrSettings?.officeEndTime || '18:00'
  
  const [startHr, startMn] = officeStartTime.split(':').map(Number)
  const [endHr, endMn] = officeEndTime.split(':').map(Number)
  const standardShiftMinutes = ((endHr * 60) + endMn) - ((startHr * 60) + startMn)
  const shiftMinutes = standardShiftMinutes > 0 ? standardShiftMinutes : 540 // Fallback to 9 hours

  const overtimeMinutes = workMinutes > shiftMinutes ? workMinutes - shiftMinutes : 0

  attendance.checkOutTime = now
  
  if (body.location) {
    attendance.checkOutLatitude = body.location.lat
    attendance.checkOutLongitude = body.location.lng
    attendance.checkOutAccuracy = body.location.accuracy
  } else {
    attendance.checkOutLatitude = body.latitude
    attendance.checkOutLongitude = body.longitude
  }

  if (body.photo) {
    attendance.checkOutPhoto = body.photo
  }

  attendance.workingMinutes = workMinutes
  attendance.breakMinutes = totalBreakMinutes
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
