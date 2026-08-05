export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import { extendTrial } from '@/lib/platformBilling'
import Subscription from '@/models/Subscription'
import Tenant from '@/models/Tenant'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'subscription.update')

  const body = await req.json()
  const { newTrialEndDate, reason } = body
  if (!newTrialEndDate) return fail('newTrialEndDate is required', 400)
  if (!reason || !reason.trim()) return fail('A reason is required to extend a trial', 400, 'REASON_REQUIRED')

  const subscription = await Subscription.findById(params.id)
  if (!subscription) return fail('Subscription not found', 404)
  const tenant = await Tenant.findOne({ _id: subscription.tenant, deleted: false })
  if (!tenant) return fail('Tenant not found', 404)

  await extendTrial({ subscription, tenant, newTrialEndDate, reason, operator: session })

  await logSuperAdmin(session, {
    action: 'SUBSCRIPTION_TRIAL_EXTENDED',
    entityType: 'Subscription',
    entityId: subscription._id,
    description: `Trial extended for ${tenant.companyName} to ${newTrialEndDate}`,
    reason,
    req,
  })

  return ok(subscription, 'Trial extended')
})
