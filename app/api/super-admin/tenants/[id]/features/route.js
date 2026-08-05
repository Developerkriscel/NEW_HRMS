export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import { validateModuleDependencies, assertModulesAllowedForPlan } from '@/lib/platformCatalogue'
import Tenant from '@/models/Tenant'
import { devSuperAdminStore } from '@/lib/devSuperAdminStore'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.update')
  const body = await req.json()
  const features = body.features || body
  const reason = body.reason
  if (!reason || !reason.trim()) return fail('A reason is required to change tenant modules', 400, 'REASON_REQUIRED')

  if (session.devLogin && process.env.NODE_ENV !== 'production') {
    const tenant = devSuperAdminStore.updateFeatures(params.id, features)
    if (!tenant) return fail('Tenant not found', 404)
    return ok(tenant, 'Features updated')
  }

  const tenant = await Tenant.findOne({ _id: params.id, deleted: false })
  if (!tenant) return fail('Tenant not found', 404)

  const before = Object.fromEntries(tenant.features.entries())
  const resulting = { ...before, ...features }
  const resultingEnabledKeys = Object.entries(resulting).filter(([, v]) => v).map(([k]) => k)

  await validateModuleDependencies(resultingEnabledKeys)
  const newlyEnabled = resultingEnabledKeys.filter((k) => !before[k])
  await assertModulesAllowedForPlan(tenant.plan, newlyEnabled)

  for (const [key, value] of Object.entries(features)) {
    tenant.features.set(key, value)
  }
  tenant.updatedBy = session.sub
  await tenant.save()

  await logSuperAdmin(session, {
    action: 'TENANT_FEATURES_UPDATED',
    entityType: 'Tenant',
    entityId: tenant._id,
    description: `Feature flags updated for ${tenant.companyName}`,
    reason,
    oldValue: JSON.stringify(before),
    newValue: JSON.stringify(Object.fromEntries(tenant.features.entries())),
    req,
  })

  return ok(tenant, 'Features updated')
})
