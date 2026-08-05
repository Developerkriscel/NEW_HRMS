export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import { recordSubscriptionHistory } from '@/lib/platformBilling'
import Tenant from '@/models/Tenant'
import Subscription from '@/models/Subscription'

const LIMIT_FIELDS = ['employeeLimit', 'storageLimitMb', 'apiQuota', 'integrationLimit']

// These are the tenant's effective limits — editing them here IS the
// "tenant-specific limit override" mechanism (see the comment on the
// Tenant schema). The plan's own limits are left untouched; only this
// tenant's row changes.
export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.update')

  const body = await req.json()
  const { reason } = body
  if (!reason || !reason.trim()) return fail('A reason is required to override a tenant limit', 400, 'REASON_REQUIRED')

  const changes = LIMIT_FIELDS.filter((f) => body[f] !== undefined)
  if (!changes.length) return fail('No limit fields provided', 400)
  for (const field of changes) {
    if (typeof body[field] !== 'number' || (body[field] < -1)) {
      return fail(`${field} must be a number (-1 for unlimited)`, 400)
    }
  }

  const tenant = await Tenant.findOne({ _id: params.id, deleted: false })
  if (!tenant) return fail('Tenant not found', 404)

  const before = {}
  for (const field of changes) {
    before[field] = tenant[field]
    tenant[field] = body[field]
  }
  tenant.updatedBy = session.sub
  await tenant.save()

  const subscription = await Subscription.findOne({ tenant: tenant._id })
  if (subscription) {
    await recordSubscriptionHistory({
      subscription, tenant, changeType: 'LIMIT_OVERRIDE',
      fromValue: JSON.stringify(before), toValue: JSON.stringify(Object.fromEntries(changes.map((f) => [f, tenant[f]]))),
      reason, operator: session,
    })
  }

  await logSuperAdmin(session, {
    action: 'TENANT_LIMITS_UPDATED',
    entityType: 'Tenant',
    entityId: tenant._id,
    description: `Limits updated for ${tenant.companyName}: ${changes.join(', ')}`,
    reason,
    oldValue: JSON.stringify(before),
    newValue: JSON.stringify(Object.fromEntries(changes.map((f) => [f, tenant[f]]))),
    req,
  })

  return ok(tenant, 'Tenant limits updated')
})
