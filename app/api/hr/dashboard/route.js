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

function startOfDay(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const today = startOfDay()
  const in30Days = new Date(today.getTime() + 30 * 86400000)

  const [
    totalEmployees,
    attendanceRecords,
    pendingLeaves,
    pendingExpensesCount,
    pendingRegularizationsCount,
    pendingResignationsCount,
    pendingTeamRequestsCount,
    newJoiners,
    upcomingHolidays,
    recentAnnouncements,
  ] = await Promise.all([
    Employee.countDocuments({ tenantId, deleted: false }),
    Attendance.find({ tenantId, date: today }).select('status lateMark').lean(),
    LeaveRequest.find({ approvedBy: session.userId, status: 'PENDING', tenantId })
      .populate('leaveType', 'name')
      .populate('employee', 'firstName lastName employeeCode')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Expense.countDocuments({ tenantId, status: 'PENDING' }),
    Attendance.countDocuments({ tenantId, regularizationStatus: 'PENDING' }),
    Resignation.countDocuments({ tenantId, status: { $in: ['SUBMITTED', 'MANAGER_REVIEWED'] } }),
    TeamRequest.countDocuments({ tenantId, status: 'PENDING' }),
    Employee.find({
      tenantId,
      deleted: false,
      joiningDate: { $gte: new Date(today.getTime() - 30 * 86400000), $lte: today }
    }).select('firstName lastName joiningDate department designation').populate('department', 'name').populate('designation', 'name').lean(),
    Holiday.find({ tenantId, date: { $gte: today, $lte: in30Days } }).sort({ date: 1 }).lean(),
    Announcement.find({ tenantId, $or: [{ scope: 'COMPANY' }] })
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
  ])

  const summary = attendanceRecords.reduce(
    (acc, record) => {
      if (record.status === 'PRESENT' || record.status === 'WFH') acc.present += 1
      if (record.status === 'ABSENT') acc.absent += 1
      if (record.lateMark) acc.late += 1
      return acc
    },
    { present: 0, absent: 0, late: 0 }
  )

  const pendingApprovalsCount = pendingLeaves.length + pendingExpensesCount + pendingRegularizationsCount + pendingResignationsCount + pendingTeamRequestsCount

  return ok({
    stats: {
      totalEmployees,
      present: summary.present,
      absent: summary.absent,
      late: summary.late,
      pendingApprovalsCount,
      pendingLeaveCount: pendingLeaves.length,
      pendingExpensesCount,
      pendingResignationsCount,
      newJoinersThisMonth: newJoiners.length,
    },
    pendingLeaves,
    newJoiners,
    upcomingHolidays,
    recentAnnouncements,
  })
})

