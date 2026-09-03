export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Employee from '@/models/Employee'
import Attendance from '@/models/Attendance'
import LeaveRequest from '@/models/LeaveRequest'
import Kra from '@/models/Kra'
import PerformanceReview from '@/models/PerformanceReview'
import TeamRequest from '@/models/TeamRequest'
import Expense from '@/models/Expense'
import AssetRequest from '@/models/AssetRequest'
import Resignation from '@/models/Resignation'

async function scopedReports(session, tenantId, employeeId, departmentId, shiftId) {
  const query = { reportingManager: session.userId, tenantId, deleted: false }
  if (employeeId) query._id = employeeId
  if (departmentId) query.department = departmentId
  if (shiftId) query.shift = shiftId
  return Employee.find(query).select('_id firstName lastName employeeCode department')
}

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER'])
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') || 'attendance'
  const from = searchParams.get('from') ? new Date(searchParams.get('from')) : new Date(new Date().setDate(1))
  const to = searchParams.get('to') ? new Date(searchParams.get('to')) : new Date()
  const employeeId = searchParams.get('employeeId')
  const departmentId = searchParams.get('departmentId')
  const status = searchParams.get('status')
  const shiftId = searchParams.get('shiftId')

  const reports = await scopedReports(session, tenantId, employeeId, departmentId, shiftId)
  const reportIds = reports.map((r) => r._id)
  const nameOf = (id) => {
    const e = reports.find((r) => String(r._id) === String(id))
    return e ? `${e.firstName} ${e.lastName}` : '—'
  }

  let rows = []

  if (type === 'attendance' || type === 'late' || type === 'absence' || type === 'overtime') {
    const query = { employee: { $in: reportIds }, tenantId, date: { $gte: from, $lte: to } }
    if (type === 'late') query.lateMark = true
    if (type === 'absence') query.status = 'ABSENT'
    if (type === 'overtime') query.overtimeMinutes = { $gt: 0 }
    const records = await Attendance.find(query).sort({ date: -1 })
    rows = records.map((a) => ({
      employee: nameOf(a.employee), date: a.date, status: a.status,
      checkIn: a.checkInTime, checkOut: a.checkOutTime,
      workingMinutes: a.workingMinutes, overtimeMinutes: a.overtimeMinutes, lateMark: a.lateMark,
    }))
  } else if (type === 'leave') {
    const query = { employee: { $in: reportIds }, tenantId, startDate: { $lte: to }, endDate: { $gte: from } }
    if (status) query.status = status
    const records = await LeaveRequest.find(query).populate('leaveType', 'name').sort({ startDate: -1 })
    rows = records.map((l) => ({
      employee: nameOf(l.employee), leaveType: l.leaveType?.name, startDate: l.startDate, endDate: l.endDate,
      days: l.numberOfDays, status: l.status,
    }))
  } else if (type === 'kra' || type === 'delay') {
    const query = { employee: { $in: reportIds }, tenantId, assignedBy: session.userId }
    const records = await Kra.find(query)
    rows = records
      .map((k) => ({
        employee: nameOf(k.employee), title: k.title, dueDate: k.dueDate, status: k.status,
        progressPercent: k.progressPercent,
        delayDays: k.dueDate && k.status !== 'APPROVED' && k.dueDate < new Date()
          ? Math.floor((Date.now() - k.dueDate.getTime()) / 86400000) : 0,
      }))
      .filter((r) => (type === 'delay' ? r.delayDays > 0 : true))
  } else if (type === 'performance') {
    const records = await PerformanceReview.find({ employee: { $in: reportIds }, tenantId, reviewer: session.userId })
    rows = records.map((p) => ({
      employee: nameOf(p.employee), periodLabel: p.periodLabel, overallRating: p.overallRating, status: p.status,
      trainingRecommended: p.trainingRecommended, promotionRecommended: p.promotionRecommended,
    }))
  } else if (type === 'pending') {
    const [teamRequests, expenses, assetRequests, resignations] = await Promise.all([
      TeamRequest.find({ employee: { $in: reportIds }, tenantId, status: 'PENDING' }),
      Expense.find({ employee: { $in: reportIds }, tenantId, status: 'PENDING' }),
      AssetRequest.find({ requestedFor: { $in: reportIds }, tenantId, status: 'PENDING' }),
      Resignation.find({ employee: { $in: reportIds }, tenantId, status: { $in: ['SUBMITTED', 'MANAGER_REVIEWED'] } }),
    ])
    rows = [
      ...teamRequests.map((r) => ({ employee: nameOf(r.employee), type: r.type, createdAt: r.createdAt, status: r.status })),
      ...expenses.map((e) => ({ employee: nameOf(e.employee), type: 'EXPENSE', createdAt: e.createdAt, status: e.status })),
      ...assetRequests.map((a) => ({ employee: nameOf(a.requestedFor), type: 'ASSET_REQUEST', createdAt: a.createdAt, status: a.status })),
      ...resignations.map((r) => ({ employee: nameOf(r.employee), type: 'RESIGNATION', createdAt: r.createdAt, status: r.status })),
    ]
  } else {
    return fail('Unknown report type', 400)
  }

  return ok({ type, rows })
})
