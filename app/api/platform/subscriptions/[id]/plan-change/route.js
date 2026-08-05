export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import { changeSubscriptionPlan } from '@/lib/platformBilling'
import { assertModulesAllowedForPlan } from '@/lib/platformCatalogue'
import Subscription from '@/models/Subscription'
import Tenant from '@/models/Tenant'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'subscription.update')

  const body = await req.json()
  const { planId, reason } = body
  if (!planId) return fail('planId is required', 400)
  if (!reason || !reason.trim()) return fail('A reason is required for a plan change', 400, 'REASON_REQUIRED')

  const subscription = await Subscription.findById(params.id)
  if (!subscription) return fail('Subscription not found', 404)
  const tenant = await Tenant.findOne({ _id: subscription.tenant, deleted: false })
  if (!tenant) return fail('Tenant not found', 404)

  // Modules currently enabled that the new plan doesn't allow at all get
  // turned off rather than left silently enabled against a plan that no
  // longer grants them.
  const enabledKeys = Array.from(tenant.features.entries()).filter(([, v]) => v).map(([k]) => k)
  try {
    await assertModulesAllowedForPlan(planId, enabledKeys)
  } catch (err) {
    if (err.errorCode === 'MODULE_NOT_ON_PLAN') {
      for (const key of enabledKeys) tenant.features.set(key, false)
      // re-validated below via changeSubscriptionPlan's own save path
    } else {
      throw err
    }
  }

  const result = await changeSubscriptionPlan({ subscription, tenant, newPlanId: planId, reason, operator: session })

  await logSuperAdmin(session, {
    action: 'SUBSCRIPTION_PLAN_CHANGED',
    entityType: 'Subscription',
    entityId: subscription._id,
    description: `Tenant ${tenant.companyName} moved to plan ${result.newPlan.name}`,
    reason,
    req,
  })

  return ok(result.subscription, 'Plan changed')
})
