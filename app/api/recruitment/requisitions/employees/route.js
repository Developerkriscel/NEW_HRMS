export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { REQUISITION_ACCESS_ROLES } from '@/lib/recruitmentConstants'
import Employee from '@/models/Employee'

// Powers the Hiring Manager / Recruiter / Employee Being Replaced pickers on
// the requisition form. Deliberately not the same query as GET /employees
// (which scopes a Manager down to just their direct reports) — a manager
// filling out this form needs to be able to pick themselves or any
// colleague as the hiring manager, not just their own reports.
export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, REQUISITION_ACCESS_ROLES)
  const tenantId = requireTenantId(session)

  const employees = await Employee.find({ tenantId, deleted: false, status: { $ne: 'TERMINATED' } })
    .select('firstName lastName employeeCode role')
    .sort({ firstName: 1 })
    .lean()

  return ok(employees.map((e) => ({
    _id: e._id,
    name: `${e.firstName} ${e.lastName}`,
    employeeCode: e.employeeCode,
    role: e.role,
  })))
})
