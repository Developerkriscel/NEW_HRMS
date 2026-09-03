export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Employee from '@/models/Employee'
import Attendance from '@/models/Attendance'
import LeaveRequest from '@/models/LeaveRequest'
import TeamRequest from '@/models/TeamRequest'
import Expense from '@/models/Expense'
import AssetRequest from '@/models/AssetRequest'
import Resignation from '@/models/Resignation'
import Kra from '@/models/Kra'

// Merges every pending team request type into one flat, sortable feed.
// Approve/Reject actions are dispatched per-type from the frontend to each
// resource's own route — this endpoint is read-only.
export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const typeFilter = searchParams.get('type')
  const managerId = session.userId

  const scope = searchParams.get('scope') || 'team'
  const isCompanyScope = scope === 'company' && ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)

  let reports;
  let reportIds;

  if (isCompanyScope) {
    reports = await Employee.find({ tenantId, deleted: false }).select('_id firstName lastName employeeCode')
    reportIds = reports.map((r) => r._id)
  } else {
    reports = await Employee.find({ reportingManager: managerId, tenantId, deleted: false }).select('_id firstName lastName employeeCode')
    reportIds = reports.map((r) => r._id)

    if (['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
      const self = await Employee.findById(managerId).select('_id firstName lastName employeeCode')
      if (self && !self.reportingManager) {
        reportIds.push(self._id)
        reports.push(self)
      }
    }
  }

  const byId = new Map(reports.map((r) => [String(r._id), r]))
  const employeeSummary = (id) => {
    const e = byId.get(String(id))
    return e ? { _id: e._id, firstName: e.firstName, lastName: e.lastName, employeeCode: e.employeeCode } : null
  }

  const items = []

  const leavesQuery = { status: 'PENDING', tenantId }
  if (isCompanyScope) {
    leavesQuery.employee = { $in: reportIds }
  } else {
    leavesQuery.approvedBy = managerId
  }
  const leaves = await LeaveRequest.find(leavesQuery).populate('leaveType', 'name')
  for (const l of leaves) {
    items.push({
      id: l._id, type: 'LEAVE', employee: employeeSummary(l.employee), status: l.status, createdAt: l.createdAt,
      summary: `${l.leaveType?.name || 'Leave'} · ${l.numberOfDays} day(s)`,
    })
  }

  const regularizations = await Attendance.find({ employee: { $in: reportIds }, tenantId, regularizationStatus: 'PENDING' })
  for (const a of regularizations) {
    items.push({
      id: a._id, type: 'ATTENDANCE_REGULARIZATION', employee: employeeSummary(a.employee), status: 'PENDING', createdAt: a.updatedAt,
      summary: a.regularizationReason || 'Attendance correction requested',
    })
  }

  const teamRequests = await TeamRequest.find({ employee: { $in: reportIds }, status: 'PENDING', tenantId })
  for (const r of teamRequests) {
    items.push({
      id: r._id, type: r.type, employee: employeeSummary(r.employee), status: r.status, createdAt: r.createdAt,
      summary: r.reason,
    })
  }

  const expenses = await Expense.find({ employee: { $in: reportIds }, status: 'PENDING', tenantId })
  for (const e of expenses) {
    items.push({
      id: e._id, type: 'EXPENSE', employee: employeeSummary(e.employee), status: e.status, createdAt: e.createdAt,
      summary: `${e.category} · ${e.amount}`,
    })
  }

  const assetRequests = await AssetRequest.find({ requestedFor: { $in: reportIds }, status: 'PENDING', tenantId })
  for (const a of assetRequests) {
    items.push({
      id: a._id, type: 'ASSET_REQUEST', employee: employeeSummary(a.requestedFor), status: a.status, createdAt: a.createdAt,
      summary: `${a.assetName} (${a.type})`,
    })
  }

  const resignations = await Resignation.find({ employee: { $in: reportIds }, status: { $in: ['SUBMITTED', 'MANAGER_REVIEWED'] }, tenantId })
  for (const r of resignations) {
    items.push({
      id: r._id, type: 'RESIGNATION', employee: employeeSummary(r.employee), status: r.status, createdAt: r.createdAt,
      summary: `Last working date: ${r.lastWorkingDate ? new Date(r.lastWorkingDate).toDateString() : 'TBD'}`,
    })
  }

  const kras = await Kra.find({ assignedBy: managerId, status: 'SUBMITTED', tenantId }).populate('employee', 'firstName lastName employeeCode')
  for (const k of kras) {
    items.push({
      id: k._id,
      type: 'KRA_REVIEW',
      employee: k.employee ? { _id: k.employee._id, firstName: k.employee.firstName, lastName: k.employee.lastName, employeeCode: k.employee.employeeCode } : null,
      status: k.status,
      createdAt: k.updatedAt || k.createdAt,
      summary: `${k.title} - ${k.progressPercent || 0}% progress`,
    })
  }

  let result = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  if (typeFilter) result = result.filter((i) => i.type === typeFilter)

  return ok(result)
})
