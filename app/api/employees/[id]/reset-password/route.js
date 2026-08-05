export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, hashPassword } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Employee from '@/models/Employee'

// Recovery path for an employee's temp password shown once at creation (see
// app/api/employees/route.js POST) — there is no email delivery channel in
// this app, so if it's lost, issuing a fresh one is the only way back in.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const employee = await Employee.findOne({ _id: params.id, tenantId, deleted: false })
  if (!employee) return fail('Employee not found', 404)

  const tempPassword = `Nexahr@${1000 + Math.floor(Math.random() * 9000)}`
  employee.password = await hashPassword(tempPassword)
  employee.updatedBy = session.sub
  await employee.save()

  await logAction(session, {
    action: 'EMPLOYEE_PASSWORD_RESET',
    entityType: 'Employee',
    entityId: employee._id,
    description: `Password reset for ${employee.getFullName()}`,
    reason: body?.reason,
  })

  return ok({ tempPassword }, 'Password reset')
})
