export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import Tenant from '@/models/Tenant'
import Employee from '@/models/Employee'
import { runForTenant } from '@/lib/tenantDb'

// Deliberately returns contact/account fields only — never salary, bank,
// tax ID, or other payroll/identity-document fields that live on the same
// Employee document. This is the one place platform operators can see into
// a tenant's Employee collection at all, so the field list here is the
// actual enforcement of "do not expose employee or payroll business data",
// not just a UI-layer convention.
const SAFE_FIELDS = 'firstName lastName email phone role status joiningDate twoFactorEnabled profilePhotoUrl createdAt'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.view')

  const tenant = await Tenant.findOne({ _id: params.id, deleted: false })
  if (!tenant) return fail('Tenant not found', 404)
  if (!tenant.adminEmail || tenant.databaseStatus !== 'READY') {
    return ok(null)
  }

  const admin = await runForTenant(tenant, () =>
    Employee.findOne({ email: tenant.adminEmail, tenantId: tenant._id, deleted: false }).select(SAFE_FIELDS)
  )

  return ok(admin)
})
