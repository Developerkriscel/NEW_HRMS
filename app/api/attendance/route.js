export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Attendance from '@/models/Attendance'
import Employee from '@/models/Employee'
import '@/models/Branch'
import '@/models/Department'
import '@/models/Shift'
import { isDevAuthAllowed } from '@/lib/devLogin'

function getLocalDayRange(dateParam) {
  let start
  if (dateParam) {
    const [y, m, d] = dateParam.split('-').map(Number)
    start = new Date(y, m - 1, d)
  } else {
    start = new Date(new Date().toDateString())
  }
  const end = new Date(start)
  end.setDate(start.getDate() + 1)
  return { start, end }
}

function calculateDurationMinutes(record) {
  if (Number(record?.workingMinutes || 0) > 0) return Math.round(Number(record.workingMinutes))
  if (!record?.checkInTime) return 0
  const checkIn = new Date(record.checkInTime)
  const checkOut = record.checkOutTime ? new Date(record.checkOutTime) : new Date()
  if (Number.isNaN(checkIn.getTime()) || Number.isNaN(checkOut.getTime()) || checkOut <= checkIn) return 0
  const breakMinutes = Number(record.breakMinutes || 0)
  return Math.max(0, Math.round((checkOut.getTime() - checkIn.getTime()) / 60000) - breakMinutes)
}

function formatDuration(minutes, inProgress = false) {
  if (inProgress && minutes <= 0) return 'In progress'
  if (!minutes) return '0h 0m'
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return inProgress ? `${hours}h ${mins}m running` : `${hours}h ${mins}m`
}

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)

  const dateParam = searchParams.get('date')
  const employeeId = searchParams.get('employeeId')
  const summaryOnly = searchParams.get('summaryOnly') === 'true'
  const { start, end } = getLocalDayRange(dateParam)

  const employeeQuery = {
    tenantId,
    deleted: false,
    status: { $in: ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD'] },
  }
  if (employeeId && employeeId !== 'all') employeeQuery._id = employeeId

  if (session.devLogin && isDevAuthAllowed(req) && summaryOnly) {
    return ok({
      records: [],
      summary: { present: 0, absent: 0, late: 0, total: 0 },
    })
  }

  if (summaryOnly && (!employeeId || employeeId === 'all')) {
    const [total, statusRows, late] = await Promise.all([
      Employee.countDocuments(employeeQuery),
      Attendance.aggregate([
        { $match: { tenantId, date: { $gte: start, $lt: end } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Attendance.countDocuments({ tenantId, date: { $gte: start, $lt: end }, lateMark: true }),
    ])
    const byStatus = Object.fromEntries(statusRows.map((row) => [row._id, row.count]))
    const present = (byStatus.PRESENT || 0) + (byStatus.WFH || 0)
    const explicitAbsent = byStatus.ABSENT || 0
    const absent = Math.max(explicitAbsent, total - present)
    return ok({
      records: [],
      summary: { present, absent, late, total },
    })
  }

  const [employees, attendanceRecords] = await Promise.all([
    Employee.find(employeeQuery)
      .select('firstName lastName employeeCode email status department branch shift')
      .populate('department', 'name')
      .populate('branch', 'name city state')
      .populate('shift', 'name startTime endTime weeklyOff workingDays')
      .sort({ firstName: 1, lastName: 1 })
      .lean(),
    Attendance.find({
      tenantId,
      date: { $gte: start, $lt: end },
      ...(employeeId && employeeId !== 'all' ? { employee: employeeId } : {}),
    }).populate('employee', 'firstName lastName employeeCode email status department branch shift').lean(),
  ])

  const attendanceByEmployee = new Map(attendanceRecords.map((record) => [String(record.employee?._id || record.employee), record]))
  const records = employees.map((employee) => {
    const existing = attendanceByEmployee.get(String(employee._id))
    if (existing) {
      const durationMinutes = calculateDurationMinutes(existing)
      return {
        ...existing,
        attendanceDate: existing.date || start,
        workDurationMinutes: durationMinutes,
        workDurationLabel: formatDuration(durationMinutes, !!existing.checkInTime && !existing.checkOutTime),
      }
    }
    return {
      _id: `absent-${employee._id}`,
      employee,
      date: start,
      attendanceDate: start,
      checkInTime: null,
      checkOutTime: null,
      status: 'ABSENT',
      lateMark: false,
      workDurationMinutes: 0,
      workDurationLabel: '0h 0m',
      regularizationRequested: false,
      verificationStatus: null,
      isGeneratedAbsence: true,
    }
  })

  const summary = {
    present: records.filter((r) => r.status === 'PRESENT' || r.status === 'WFH').length,
    absent: records.filter((r) => r.status === 'ABSENT').length,
    late: records.filter((r) => r.lateMark).length,
    total: employees.length,
  }

  return ok({ records, summary })
})
