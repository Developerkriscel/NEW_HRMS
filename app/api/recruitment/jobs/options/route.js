export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { JOB_VIEW_ROLES } from '@/lib/jobConstants'
import Branch from '@/models/Branch'
import Department from '@/models/Department'
import Employee from '@/models/Employee'

// Hiring form lookups are part of Recruitment access so users with a limited
// module grant do not also need separate Branches/Departments/Employees grants.
export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const [departments, branches, employees] = await Promise.all([
    Department.find({ tenantId, deleted: false, active: { $ne: false } }).select('name active').sort({ name: 1 }).lean(),
    Branch.find({ tenantId, deleted: false, active: { $ne: false } }).select('name city active').sort({ name: 1 }).lean(),
    Employee.find({ tenantId, deleted: false, status: 'ACTIVE' }).select('firstName lastName employeeCode role').sort({ firstName: 1 }).lean(),
  ])

  return ok({ departments, branches, employees })
})
