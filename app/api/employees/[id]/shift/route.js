export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Employee from '@/models/Employee'

// Narrow route so a MANAGER can reassign a direct report's shift without
// being granted the full employee-edit route (PUT /api/employees/[id]),
// which stays restricted to COMPANY_ADMIN/HR_MANAGER/SUPER_ADMIN.
export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const employee = await Employee.findOne({ _id: params.id, tenantId, deleted: false })
  if (!employee) return fail('Employee not found', 404)

  if (session.role === 'MANAGER' && String(employee.reportingManager) !== String(session.userId)) {
    return fail('You can only reassign shifts for your own direct reports', 403)
  }

  employee.shift = body.shiftId || null
  employee.updatedBy = session.sub
  await employee.save()

  await logAction(session, {
    action: 'EMPLOYEE_SHIFT_CHANGED',
    entityType: 'Employee',
    entityId: employee._id,
    description: `Shift updated for ${employee.getFullName()}`,
  })

  return ok(employee, 'Shift updated')
})
