export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole } from '@/lib/auth'
import Tenant from '@/models/Tenant'
import Employee from '@/models/Employee'
import { runForTenant } from '@/lib/tenantDb'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, 'SUPER_ADMIN')

  const tenant = await Tenant.findOne({ _id: params.id, deleted: false })
  if (!tenant) return fail('Tenant not found', 404)

  const employeeCount = await runForTenant(tenant, () => Employee.countDocuments({ tenantId: tenant._id, deleted: false }))
  const usagePercent = tenant.employeeLimit > 0 ? Math.round((employeeCount / tenant.employeeLimit) * 100) : null

  return ok({
    employeeCount,
    employeeLimit: tenant.employeeLimit,
    usagePercent,
    storageLimitMb: tenant.storageLimitMb,
    storageUsedMb: tenant.storageUsedMb,
    databaseName: tenant.databaseName,
    databaseStatus: tenant.databaseStatus,
    databaseLastCheckedAt: tenant.databaseLastCheckedAt,
    databaseError: tenant.databaseError,
  })
})
