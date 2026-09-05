export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Tenant from '@/models/Tenant'
import Plan from '@/models/Plan'
import Subscription from '@/models/Subscription'
import InvoiceMetadata from '@/models/InvoiceMetadata'
import SubscriptionCredit from '@/models/SubscriptionCredit'

function daysUntil(value) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)
  return Math.ceil((date.getTime() - today.getTime()) / 86400000)
}

function nextBillingDate(subscription) {
  if (!subscription) return null
  if (subscription.status === 'GRACE') return subscription.graceEndsAt || subscription.endDate || subscription.trialEndDate
  if (subscription.status === 'TRIAL') return subscription.trialEndDate || subscription.endDate
  return subscription.endDate || subscription.trialEndDate
}

export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const tenant = await Tenant.findOne({ _id: tenantId, deleted: false }).populate('plan')
  if (!tenant) return fail('Company profile not found', 404)

  const [subscription, plans] = await Promise.all([
    Subscription.findOne({ tenant: tenantId, deleted: false }).populate('plan'),
    Plan.find({ deleted: false, active: true }).sort({ sortOrder: 1, price: 1 }).lean(),
  ])

  const [invoices, credits] = subscription
    ? await Promise.all([
        InvoiceMetadata.find({ subscription: subscription._id, deleted: false }).sort({ createdAt: -1 }).limit(5).lean(),
        SubscriptionCredit.find({ subscription: subscription._id, deleted: false }).sort({ createdAt: -1 }).limit(5).lean(),
      ])
    : [[], []]

  const currentPlan = subscription?.plan || tenant.plan || null
  const renewalDate = nextBillingDate(subscription)

  return ok({
    tenant: {
      _id: tenant._id,
      companyName: tenant.companyName,
      tenantCode: tenant.tenantCode,
      status: tenant.status,
      employeeLimit: tenant.employeeLimit,
      storageLimitMb: tenant.storageLimitMb,
      storageUsedMb: tenant.storageUsedMb,
      apiQuota: tenant.apiQuota,
      integrationLimit: tenant.integrationLimit,
      currency: tenant.currency,
    },
    subscription,
    currentPlan,
    plans,
    invoices,
    credits,
    renewalDate,
    daysRemaining: daysUntil(renewalDate),
  })
})
