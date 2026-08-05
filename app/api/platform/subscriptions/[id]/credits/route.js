export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import { recordSubscriptionHistory } from '@/lib/platformBilling'
import Subscription from '@/models/Subscription'
import Tenant from '@/models/Tenant'
import SubscriptionCredit from '@/models/SubscriptionCredit'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'subscription.view')
  const credits = await SubscriptionCredit.find({ subscription: params.id, deleted: false }).sort({ createdAt: -1 })
  return ok(credits)
})

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'subscription.apply_credit')

  const body = await req.json()
  const { amount, currency, reason } = body
  if (!amount || amount <= 0) return fail('A positive credit amount is required', 400)
  if (!reason || !reason.trim()) return fail('A reason is required to apply a credit', 400, 'REASON_REQUIRED')

  const subscription = await Subscription.findById(params.id)
  if (!subscription) return fail('Subscription not found', 404)
  const tenant = await Tenant.findOne({ _id: subscription.tenant, deleted: false })
  if (!tenant) return fail('Tenant not found', 404)

  const credit = await SubscriptionCredit.create({
    subscription: subscription._id,
    tenant: tenant._id,
    amount,
    currency: currency || tenant.currency || 'INR',
    reason,
    appliedBy: session.userId,
    appliedByEmail: session.sub,
  })

  await recordSubscriptionHistory({
    subscription, tenant, changeType: 'CREDIT_APPLIED',
    fromValue: null, toValue: `${amount} ${currency || 'INR'}`, reason, operator: session,
  })

  await logSuperAdmin(session, {
    action: 'SUBSCRIPTION_CREDIT_APPLIED',
    entityType: 'SubscriptionCredit',
    entityId: credit._id,
    description: `Credit of ${amount} ${currency || 'INR'} applied to ${tenant.companyName}`,
    reason,
    req,
  })

  return ok(credit, 'Credit applied', 201)
})
