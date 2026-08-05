export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole } from '@/lib/auth'
import { logSuperAdmin } from '@/lib/audit'
import Tenant from '@/models/Tenant'
import { provisionTenantDatabase } from '@/lib/tenantDb'
import { devSuperAdminStore } from '@/lib/devSuperAdminStore'

export const POST = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, 'SUPER_ADMIN')
  if (session.devLogin && process.env.NODE_ENV !== 'production') {
    const tenant = devSuperAdminStore.provisionDatabase(params.id)
    if (!tenant) return fail('Tenant not found', 404)
    return ok(tenant, 'Tenant database is ready')
  }

  const tenant = await Tenant.findOne({ _id: params.id, deleted: false })
  if (!tenant) return fail('Tenant not found', 404)

  await provisionTenantDatabase(tenant, { createdBy: session.sub })

  await logSuperAdmin(session, {
    action: 'TENANT_DATABASE_PROVISIONED',
    entityType: 'Tenant',
    entityId: tenant._id,
    description: `Tenant database ${tenant.databaseName} provisioned for ${tenant.companyName}`,
  })

  return ok(tenant, 'Tenant database is ready')
})
