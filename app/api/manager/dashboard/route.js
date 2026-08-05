export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Employee from '@/models/Employee'
import Attendance from '@/models/Attendance'
import LeaveRequest from '@/models/LeaveRequest'
import Kra from '@/models/Kra'
import TeamRequest from '@/models/TeamRequest'
import Expense from '@/models/Expense'
import AssetRequest from '@/models/AssetRequest'
import Resignation from '@/models/Resignation'
import Holiday from '@/models/Holiday'
import Announcement from '@/models/Announcement'
import PerformanceReview from '@/models/PerformanceReview'

function startOfDay(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER'])
  const tenantId = requireTenantId(session)
  const managerId = session.userId

  const today = startOfDay()
  const in30Days = new Date(today.getTime() + 30 * 86400000)

  const reports = await Employee.find({ reportingManager: managerId, tenantId, deleted: false })
  const reportIds = reports.map((r) => r._id)
  const teamSize = reports.length

  const todaysAttendance = await Attendance.find({ employee: { $in: reportIds }, tenantId, date: today })
  const presentToday = todaysAttendance.filter((a) => ['PRESENT', 'WFH', 'HALF_DAY'].includes(a.status)).length
  const lateToday = todaysAttendance.filter((a) => a.lateMark).length

  const onLeaveToday = await LeaveRequest.countDocuments({
    employee: { $in: reportIds },
    tenantId,
    status: 'APPROVED',
    startDate: { $lte: today },
    endDate: { $gte: today },
  })
  const absentToday = Math.max(0, teamSize - presentToday - onLeaveToday)

  const [pendingLeave, pendingRegularization, pendingTeamRequests, pendingExpenses, pendingAssetRequests, pendingResignations, pendingKraReviews] =
    await Promise.all([
      LeaveRequest.countDocuments({ approvedBy: managerId, status: 'PENDING', tenantId }),
      Attendance.countDocuments({ employee: { $in: reportIds }, tenantId, regularizationStatus: 'PENDING' }),
      TeamRequest.countDocuments({ employee: { $in: reportIds }, tenantId, status: 'PENDING' }),
      Expense.countDocuments({ employee: { $in: reportIds }, tenantId, status: 'PENDING' }),
      AssetRequest.countDocuments({ requestedFor: { $in: reportIds }, tenantId, status: 'PENDING' }),
      Resignation.countDocuments({ employee: { $in: reportIds }, tenantId, status: { $in: ['SUBMITTED', 'MANAGER_REVIEWED'] } }),
      Kra.countDocuments({ assignedBy: managerId, tenantId, status: 'SUBMITTED' }),
    ])
  const pendingApprovalsCount =
    pendingLeave + pendingRegularization + pendingTeamRequests + pendingExpenses + pendingAssetRequests + pendingResignations + pendingKraReviews

  const upcomingBirthdays = reports
    .filter((e) => e.dateOfBirth)
    .map((e) => {
      const dob = new Date(e.dateOfBirth)
      const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate())
      if (next < today) next.setFullYear(today.getFullYear() + 1)
      return { employeeId: e._id, name: e.getFullName(), date: next }
    })
    .filter((b) => b.date <= in30Days)
    .sort((a, b) => a.date - b.date)

  const upcomingHolidays = await Holiday.find({ tenantId, date: { $gte: today, $lte: in30Days } }).sort({ date: 1 })

  const activeKras = await Kra.find({ employee: { $in: reportIds }, tenantId, status: { $ne: 'APPROVED' } })
  const avgKraProgress = activeKras.length
    ? Math.round(activeKras.reduce((s, k) => s + (k.progressPercent || 0), 0) / activeKras.length)
    : null
  const recentReviews = await PerformanceReview.find({ reviewer: managerId, tenantId, status: 'SUBMITTED', overallRating: { $ne: null } })
    .sort({ submittedAt: -1 })
    .limit(20)
  const avgRating = recentReviews.length
    ? Math.round((recentReviews.reduce((s, r) => s + r.overallRating, 0) / recentReviews.length) * 10) / 10
    : null

  const recentAnnouncements = await Announcement.find({
    tenantId,
    $or: [{ scope: 'COMPANY' }, { scope: 'TEAM', team: managerId }],
  })
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(5)

  return ok({
    teamSize,
    presentToday,
    absentToday,
    onLeaveToday,
    lateToday,
    pendingApprovalsCount,
    pendingKraReviews,
    upcomingBirthdays,
    upcomingHolidays,
    teamPerformanceSummary: { avgKraProgress, avgRating },
    recentAnnouncements,
  })
})
