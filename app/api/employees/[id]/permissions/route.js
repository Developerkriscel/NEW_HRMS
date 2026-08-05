export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Employee from '@/models/Employee'
import Permission from '@/models/Permission'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { permissionIds } = await req.json()

  const employee = await Employee.findOne({ _id: params.id, tenantId, deleted: false })
  if (!employee) return fail('Employee not found', 404)

  const ids = Array.isArray(permissionIds) ? permissionIds : []
  const grantedPermissions = await Permission.find({ _id: { $in: ids }, deleted: false })
  if (grantedPermissions.length !== ids.length) return fail('One or more selected permissions are invalid', 400)

  employee.permissions = ids
  employee.updatedBy = session.sub
  await employee.save()

  await logAction(session, {
    action: 'EMPLOYEE_PERMISSIONS_UPDATED',
    entityType: 'Employee',
    entityId: employee._id,
    description: `Custom permissions updated for ${employee.getFullName()}`,
  })

  // .populate('permissions') is unreliable in this app's multi-tenant setup
  // (Permission is force-registered as tenant-scoped despite having no
  // tenantId field — see models/_base.js) — attach the already-fetched,
  // already-validated permission docs directly instead of re-populating.
  const responseEmployee = employee.toObject()
  delete responseEmployee.password
  responseEmployee.permissions = grantedPermissions
  return ok(responseEmployee, 'Permissions updated')
})
