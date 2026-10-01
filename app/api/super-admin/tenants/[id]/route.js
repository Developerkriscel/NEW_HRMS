export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import Tenant from '@/models/Tenant'

const UPDATABLE_FIELDS = [
  'companyName', 'legalBusinessName', 'industryType', 'website', 'logoUrl',
  'gstNumber', 'panNumber', 'businessRegistrationNumber', 'email', 'phone',
  'address', 'country', 'state', 'city', 'pincode', 'timezone', 'currency',
  'employeeLimit', 'storageLimitMb'
]

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.view')

  const tenant = await Tenant.findOne({ _id: params.id, deleted: false }).populate('plan')
  if (!tenant) return fail('Tenant not found', 404)
  return ok(tenant)
})

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.update')
  const body = await req.json()

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
