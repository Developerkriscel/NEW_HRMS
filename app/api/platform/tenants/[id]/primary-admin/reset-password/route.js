export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, hashPassword } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import Tenant from '@/models/Tenant'
import Employee from '@/models/Employee'
import { runForTenant } from '@/lib/tenantDb'

// Recovery path for the one-time temp password shown at company creation —
// that password is never stored anywhere retrievable (see primary-admin's
// GET handler), so if a super admin misses or loses it, the only way back
// in is a fresh one, same as "forgot password" anywhere else in this app.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.update')

  const body = await req.json().catch(() => ({}))
  const reason = body?.reason

  const tenant = await Tenant.findOne({ _id: params.id, deleted: false })
  if (!tenant) return fail('Tenant not found', 404)
  if (!tenant.adminEmail || tenant.databaseStatus !== 'READY') {
    return fail('This company has no provisioned primary administrator yet', 400)
  }

  const tempPassword = `Nexahr@${1000 + Math.floor(Math.random() * 9000)}`
  const hashed = await hashPassword(tempPassword)

  const admin = await runForTenant(tenant, async () => {
    const employee = await Employee.findOne({ email: tenant.adminEmail, tenantId: tenant._id, deleted: false })
    if (!employee) return null
    employee.password = hashed
    employee.updatedBy = session.sub
    await employee.save()
    return employee
  })

  if (!admin) return fail('Primary administrator record not found', 404)

  await logSuperAdmin(session, {
    action: 'TENANT_ADMIN_PASSWORD_RESET',
    entityType: 'Tenant',
    entityId: tenant._id,
    description: `Reset primary admin password for ${tenant.companyName}`,
    reason,
    req,
  })

  return ok({ tempPassword }, 'Password reset')
})
