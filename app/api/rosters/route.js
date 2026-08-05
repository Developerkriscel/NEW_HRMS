export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Roster from '@/models/Roster'
import Employee from '@/models/Employee'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const weekStartDate = searchParams.get('weekStartDate')
  const employeeId = searchParams.get('employeeId')
  if (!weekStartDate) return fail('weekStartDate is required', 400)

  const query = { tenantId, weekStartDate: new Date(weekStartDate) }
  if (session.role === 'EMPLOYEE') {
    query.employee = session.userId
  } else if (session.role === 'MANAGER') {
    const reports = await Employee.find({ reportingManager: session.userId, tenantId, deleted: false }).select('_id')
    query.employee = { $in: reports.map((r) => r._id) }
  } else {
    await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
    if (employeeId) query.employee = employeeId
  }

  const rosters = await Roster.find(query)
    .populate('employee', 'firstName lastName employeeCode')
    .populate('entries.shift', 'name startTime endTime')
  return ok(rosters)
})

// Upsert a week's roster for one employee.
export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()
  if (!body.employeeId || !body.weekStartDate || !Array.isArray(body.entries)) {
    return fail('employeeId, weekStartDate and entries are required', 400)
  }

  if (session.role === 'MANAGER') {
    const employee = await Employee.findOne({ _id: body.employeeId, tenantId })
    if (!employee || String(employee.reportingManager) !== session.userId) {
      return fail('You can only build a roster for your own direct reports', 403)
    }
  }

  const roster = await Roster.findOneAndUpdate(
    { employee: body.employeeId, weekStartDate: new Date(body.weekStartDate), tenantId },
    {
      employee: body.employeeId,
      weekStartDate: new Date(body.weekStartDate),
      entries: body.entries,
      createdBy: session.userId,
      tenantId,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  await logAction(session, {
    action: 'ROSTER_SAVED',
    entityType: 'Roster',
    entityId: roster._id,
    description: `Weekly roster saved for week of ${body.weekStartDate}`,
  })

  return ok(roster, 'Roster saved')
})
