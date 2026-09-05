export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import { manageGracePeriod } from '@/lib/platformBilling'
import Subscription from '@/models/Subscription'
import Tenant from '@/models/Tenant'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'subscription.update')

  const body = await req.json()
  const { action, reason, graceDays } = body
  if (!reason || !reason.trim()) return fail('A reason is required for grace-period changes', 400, 'REASON_REQUIRED')

  const subscription = await Subscription.findOne({ _id: params.id, deleted: false })
  if (!subscription) return fail('Subscription not found', 404)
  const tenant = await Tenant.findOne({ _id: subscription.tenant, deleted: false })
  if (!tenant) return fail('Tenant not found', 404)

  await manageGracePeriod({ subscription, tenant, action, reason, operator: session, graceDays })

  await logSuperAdmin(session, {
    action: action === 'ENTER' ? 'SUBSCRIPTION_GRACE_STARTED' : 'SUBSCRIPTION_GRACE_ENDED',
    entityType: 'Subscription',
    entityId: subscription._id,
    description: `Grace period ${action === 'ENTER' ? 'started' : 'ended'} for ${tenant.companyName}`,
    reason,
    req,
  })

  return ok(subscription, `Grace period ${action === 'ENTER' ? 'started' : 'ended'}`)
})
