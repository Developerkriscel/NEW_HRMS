export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Attendance from '@/models/Attendance'
import Employee from '@/models/Employee'
import LeaveBalance from '@/models/LeaveBalance'
import LeaveRequest from '@/models/LeaveRequest'
import TeamRequest from '@/models/TeamRequest'
import Announcement from '@/models/Announcement'
import Payslip from '@/models/Payslip'
import Tenant from '@/models/Tenant'

function dateKeyFor(dateInput, timezone) {
  if (!dateInput) return null
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) return null
  try {
    return date.toLocaleDateString('en-CA', { timeZone: timezone })
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

function utcDayWindow(dateKey, beforeDays = 1, afterDays = 2) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return {
    from: new Date(Date.UTC(year, month - 1, day - beforeDays, 0, 0, 0)),
    to: new Date(Date.UTC(year, month - 1, day + afterDays, 23, 59, 59, 999)),
  }
}

function buildAttendanceHistory(records, employee, tenant, timezone) {
  const todayKey = dateKeyFor(new Date(), timezone)
  const [year, month] = todayKey.split('-')
  const fromKey = `${year}-${month}-01`
  const joiningKey = employee?.joiningDate ? dateKeyFor(employee.joiningDate, timezone) : '2000-01-01'
  const weeklyOffs = employee?.weekOff
    ? employee.weekOff.split(',').map((day) => day.trim().toLowerCase())
    : (tenant?.hrSettings?.weeklyOff || []).map((day) => day.trim().toLowerCase())

  const recordsMap = new Map()
  for (const record of records) {
    const key = dateKeyFor(record.checkInTime, timezone) || dateKeyFor(record.date, timezone)
    if (key) recordsMap.set(key, record)
  }

  const days = []
  const [startYear, startMonth, startDay] = fromKey.split('-').map(Number)
  const [endYear, endMonth, endDay] = todayKey.split('-').map(Number)
  const cursor = new Date(Date.UTC(startYear, startMonth - 1, startDay))
  const end = new Date(Date.UTC(endYear, endMonth - 1, endDay))
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

  while (cursor <= end) {
    const key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, '0')}-${String(cursor.getUTCDate()).padStart(2, '0')}`
    if (recordsMap.has(key)) {
      const record = recordsMap.get(key)
      days.push({ ...record, date: record.date || new Date(`${key}T12:00:00Z`).toISOString() })
    } else if (key >= joiningKey && key !== todayKey && !weeklyOffs.includes(dayNames[cursor.getUTCDay()].toLowerCase())) {
      days.push({
        _id: `absent-${key}`,
        employee: employee?._id,
        date: new Date(`${key}T12:00:00Z`).toISOString(),
        status: 'ABSENT',
        checkInTime: null,
        checkOutTime: null,
        workingMinutes: 0,
      })
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  return days.sort((a, b) => new Date(b.checkInTime || b.date).getTime() - new Date(a.checkInTime || a.date).getTime())
}

export const GET = withApi(async () => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const employeeId = session.userId
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1

  const [tenant, employee] = await Promise.all([
    Tenant.findById(tenantId).select('timezone hrSettings.weeklyOff').lean(),
    Employee.findById(employeeId).select('joiningDate weekOff reportingManager').lean(),
  ])

  const timezone = tenant?.timezone || 'Asia/Kolkata'
  const todayKey = dateKeyFor(now, timezone)
  const monthStartKey = `${todayKey.slice(0, 7)}-01`
  const todayWindow = utcDayWindow(todayKey, 0, 1)
  const monthWindow = utcDayWindow(monthStartKey, 1, 32)

  const announcementQuery = { tenantId, $or: [{ scope: 'COMPANY' }] }
  if (session.role === 'MANAGER') {
    announcementQuery.$or.push({ scope: 'TEAM', team: employeeId })
  } else if (employee?.reportingManager) {
    announcementQuery.$or.push({ scope: 'TEAM', team: employee.reportingManager })
  }

  const [
    todayRecord,
    attendanceRecords,
    leaveBalances,
    upcomingLeaves,
    recentRequests,
    pendingRequests,
    announcements,
    latestPayslip,
  ] = await Promise.all([
    Attendance.findOne({
      employee: employeeId,
      tenantId,
      $or: [
        { date: { $gte: todayWindow.from, $lte: todayWindow.to } },
        { checkInTime: { $gte: todayWindow.from, $lte: todayWindow.to } },
      ],
    }).sort({ checkInTime: -1, date: -1 }).lean(),
    Attendance.find({
      employee: employeeId,
      tenantId,
      $or: [
        { date: { $gte: monthWindow.from, $lte: monthWindow.to } },
        { checkInTime: { $gte: monthWindow.from, $lte: monthWindow.to } },
      ],
    }).sort({ date: -1 }).lean(),
    LeaveBalance.find({ employee: employeeId, tenantId, year })
      .select('leaveType totalDays usedDays carryForwardDays pendingDays')
      .populate('leaveType', 'name')
      .lean(),
    LeaveRequest.find({ employee: employeeId, tenantId, status: 'APPROVED', startDate: { $gte: now } })
      .select('leaveType startDate endDate numberOfDays status')
      .populate('leaveType', 'name')
      .sort({ startDate: 1 })
      .limit(5)
      .lean(),
    TeamRequest.find({ employee: employeeId, tenantId })
      .select('type status createdAt fromDate toDate')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    TeamRequest.countDocuments({ employee: employeeId, tenantId, status: 'PENDING' }),
    Announcement.find(announcementQuery)
      .select('title body createdAt')
      .sort({ createdAt: -1 })
      .limit(3)
      .lean(),
    Payslip.findOne({
      employee: employeeId,
      tenantId,
      deleted: false,
      status: { $in: ['APPROVED', 'FINALIZED', 'PAID'] },
    })
      .sort({ year: -1, month: -1 })
      .select('month year netSalary status paymentDate')
      .lean(),
  ])

  return ok({
    todayRecord: todayRecord || null,
    attendanceHistory: buildAttendanceHistory(attendanceRecords, employee, tenant, timezone),
    leaveBalances,
    upcomingLeaves,
    pendingRequests,
    recentRequests,
    announcements: announcements.map((item) => ({ ...item, content: item.body })),
    latestPayslip: latestPayslip || null,
  })
})
