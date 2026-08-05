export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import Tenant from '@/models/Tenant'
import { devSuperAdminStore } from '@/lib/devSuperAdminStore'

const UPDATABLE_FIELDS = ['companyName', 'phone', 'address', 'city', 'state', 'gstNumber', 'employeeLimit', 'storageLimitMb']

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.view')
  if (session.devLogin && process.env.NODE_ENV !== 'production') {
    const tenant = devSuperAdminStore.getTenant(params.id)
    if (!tenant) return fail('Tenant not found', 404)
    return ok(tenant)
  }

  const tenant = await Tenant.findOne({ _id: params.id, deleted: false }).populate('plan')
  if (!tenant) return fail('Tenant not found', 404)
  return ok(tenant)
})

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.update')
  const body = await req.json()
  if (session.devLogin && process.env.NODE_ENV !== 'production') {
    const tenant = devSuperAdminStore.updateTenant(params.id, body)
    if (!tenant) return fail('Tenant not found', 404)
    return ok(tenant, 'Tenant updated')
  }

  const tenant = await Tenant.findOne({ _id: params.id, deleted: false })
  if (!tenant) return fail('Tenant not found', 404)

  for (const field of UPDATABLE_FIELDS) {
    if (body[field] !== undefined) tenant[field] = body[field]
  }
  tenant.updatedBy = session.sub
  await tenant.save()

  await logSuperAdmin(session, {
    action: 'TENANT_UPDATED',
    entityType: 'Tenant',
    entityId: tenant._id,
    description: `Tenant ${tenant.companyName} updated`,
  })

  return ok(tenant, 'Tenant updated')
})
