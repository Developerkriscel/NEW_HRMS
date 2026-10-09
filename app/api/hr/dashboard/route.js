export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Employee from '@/models/Employee'
import Attendance from '@/models/Attendance'
import LeaveRequest from '@/models/LeaveRequest'
import Expense from '@/models/Expense'
import Holiday from '@/models/Holiday'
import Announcement from '@/models/Announcement'
import Resignation from '@/models/Resignation'
import TeamRequest from '@/models/TeamRequest'
import '@/models/Department'
import '@/models/Designation'
import '@/models/LeaveType'

function getDateRange(period) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  switch ((period || '').toLowerCase().replace(/[\s_-]+/g, '')) {
    case 'yesterday': {
      const start = new Date(todayStart)
      start.setDate(start.getDate() - 1)
      const end = new Date(todayEnd)
      end.setDate(end.getDate() - 1)
      return { start, end, label: 'Yesterday', suffix: 'yesterday', isSingleDay: true }
    }
    case 'thisweek': {
      const start = new Date(todayStart)
      const day = start.getDay()
      const diff = day === 0 ? 6 : day - 1
      start.setDate(start.getDate() - diff)
      const end = new Date(todayEnd)
      return { start, end, label: 'This Week', suffix: 'this week', isSingleDay: false }
    }
    case 'thismonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const end = new Date(todayEnd)
      return { start, end, label: 'This Month', suffix: 'this month', isSingleDay: false }
    }
    case 'last6months': {
      const start = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0)
      const end = new Date(todayEnd)
      return { start, end, label: 'Last 6 Months', suffix: 'last 6 months', isSingleDay: false }
    }
    case 'alltime': {
      const start = new Date(2000, 0, 1)
      const end = new Date(todayEnd)
      return { start, end, label: 'All Time', suffix: 'all time', isSingleDay: false }
    }
    case 'today':
    default: {
      return { start: todayStart, end: todayEnd, label: 'Today', suffix: 'today', isSingleDay: true }
    }
  }
}

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const url = new URL(req.url)
  const period = url.searchParams.get('period') || 'This Week'
  const range = getDateRange(period)

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const in30Days = new Date(todayStart.getTime() + 30 * 86400000)

  const [
    totalEmployees,
    attendanceRecords,
    onLeaveCount,
    pendingLeaveCount,
    pendingExpensesCount,
    pendingRegularizationsCount,
    pendingResignationsCount,
    pendingTeamRequestsCount,
    periodJoiners,
    recentJoiners,
    upcomingHolidays,
    rawAnnouncements,
  ] = await Promise.all([
    Employee.countDocuments({ tenantId, deleted: false }),
    Attendance.find({
      tenantId,
      date: { $gte: range.start, $lte: range.end },
    })
      .select('status lateMark employee checkInTime date')
      .lean(),
    LeaveRequest.countDocuments({
      tenantId,
      status: 'APPROVED',
      startDate: { $lte: range.end },
      endDate: { $gte: range.start },
    }),
    LeaveRequest.countDocuments({ tenantId, status: 'PENDING' }),
    Expense.countDocuments({ tenantId, status: 'PENDING' }),
    Attendance.countDocuments({ tenantId, regularizationStatus: 'PENDING' }),
    Resignation.countDocuments({ tenantId, status: { $in: ['SUBMITTED', 'MANAGER_REVIEWED', 'FORWARDED_TO_HR'] } }),
    TeamRequest.countDocuments({ tenantId, status: 'PENDING' }),
    Employee.find({
      tenantId,
      deleted: false,
      joiningDate: { $gte: range.start, $lte: range.end },
    })
      .select('firstName lastName joiningDate department designation email avatar')
      .populate('department', 'name')
      .populate('designation', 'name')
      .sort({ joiningDate: -1 })
      .lean(),
    Employee.find({
      tenantId,
      deleted: false,
      joiningDate: { $gte: new Date(todayStart.getTime() - 60 * 86400000), $lte: new Date(todayStart.getTime() + 86400000) },
    })
      .select('firstName lastName joiningDate department designation email avatar')
      .populate('department', 'name')
      .populate('designation', 'name')
      .sort({ joiningDate: -1 })
      .limit(6)
      .lean(),
    Holiday.find({
      tenantId,
      deleted: { $ne: true },
      date: { $gte: todayStart, $lte: in30Days },
    })
      .sort({ date: 1 })
      .limit(5)
      .lean(),
    Announcement.find({
      tenantId,
      deleted: { $ne: true },
    })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ])

  // Compute attendance stats
  const presentRecords = attendanceRecords.filter((r) =>
    ['PRESENT', 'WFH', 'HALF_DAY'].includes(r.status)
  )
  const explicitAbsent = attendanceRecords.filter((r) => r.status === 'ABSENT').length
  const lateCount = attendanceRecords.filter((r) => r.lateMark).length

  const present = range.isSingleDay
    ? presentRecords.length
    : new Set(presentRecords.map((r) => String(r.employee))).size

  const absent = Math.max(explicitAbsent, Math.max(0, totalEmployees - present - onLeaveCount))
  const attendanceRate = totalEmployees > 0 ? Math.round((present / totalEmployees) * 100) : 0

  const pendingApprovalsCount =
    pendingLeaveCount +
    pendingExpensesCount +
    pendingRegularizationsCount +
    pendingResignationsCount +
    pendingTeamRequestsCount

  const displayJoiners = periodJoiners.length > 0 ? periodJoiners : recentJoiners

  const announcements = rawAnnouncements.map((a) => ({
    ...a,
    message: a.body || a.message || '',
    body: a.body || a.message || '',
  }))

  return ok({
    stats: {
      totalEmployees,
      present,
      absent,
      late: lateCount,
      onLeaveCount,
      attendanceRate,
      pendingApprovalsCount,
      pendingLeaveCount,
      pendingExpensesCount,
      pendingResignationsCount,
      newJoinersCount: periodJoiners.length,
      newJoinersThisMonth: periodJoiners.length,
      newJoinersSuffix: range.suffix,
      periodLabel: range.label,
    },
    filter: {
      period: range.label,
      start: range.start,
      end: range.end,
    },
    newJoiners: displayJoiners,
    upcomingHolidays,
    recentAnnouncements: announcements,
  })
})
