export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import { changeSubscriptionStatus } from '@/lib/platformBilling'
import Subscription from '@/models/Subscription'
import Tenant from '@/models/Tenant'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'subscription.update')

  const body = await req.json()
  const { toStatus, reason } = body
  if (!reason || !reason.trim()) return fail('A reason is required for a subscription status change', 400, 'REASON_REQUIRED')

  const subscription = await Subscription.findById(params.id)
  if (!subscription) return fail('Subscription not found', 404)
  const tenant = await Tenant.findOne({ _id: subscription.tenant, deleted: false })
  if (!tenant) return fail('Tenant not found', 404)

  await changeSubscriptionStatus({ subscription, tenant, toStatus, reason, operator: session })

  await logSuperAdmin(session, {
    action: 'SUBSCRIPTION_STATUS_CHANGED',
    entityType: 'Subscription',
    entityId: subscription._id,
    description: `Subscription for ${tenant.companyName} moved to ${toStatus}`,
    reason,
    req,
  })

  return ok(subscription, 'Subscription status updated')
})
