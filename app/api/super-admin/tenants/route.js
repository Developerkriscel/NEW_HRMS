export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, paged } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import Tenant from '@/models/Tenant'
import Subscription from '@/models/Subscription'

const SORTABLE_FIELDS = new Set(['companyName', 'tenantCode', 'status', 'provisioningStatus', 'createdAt', 'employeeLimit'])

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.view')

  const { searchParams } = new URL(req.url)
  const page = Math.max(0, Number(searchParams.get('page') || 0))
  const size = Math.min(100, Math.max(1, Number(searchParams.get('size') || 20)))
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const plan = searchParams.get('plan')
  const provisioningStatus = searchParams.get('provisioningStatus')
  const sortBy = SORTABLE_FIELDS.has(searchParams.get('sortBy')) ? searchParams.get('sortBy') : 'createdAt'
  const sortDir = searchParams.get('sortDir') === 'asc' ? 1 : -1

  const query = { deleted: false }
  if (status) query.status = status
  if (plan) query.plan = plan
  if (provisioningStatus) query.provisioningStatus = provisioningStatus
  if (search) {
    query.$or = [
      { companyName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { tenantCode: { $regex: search, $options: 'i' } },
      { subdomain: { $regex: search, $options: 'i' } },
      { adminEmail: { $regex: search, $options: 'i' } },
    ]
  }

  const projection = 'tenantCode companyName email subdomain logoUrl status employeeLimit provisioningStatus createdAt adminEmail plan databaseStatus'
  const contentQuery = Tenant.find(query)
    .select(projection)
    .populate('plan', 'name price billingCycle employeeLimit')
    .sort({ [sortBy]: sortDir })
    .skip(page * size)
    .limit(size)
    .lean()

  const [totalElements, content] = await Promise.all([
    Tenant.countDocuments(query),
    contentQuery,
  ])

  const tenantIds = content.map((tenant) => tenant._id)
  const subscriptions = tenantIds.length
    ? await Subscription.find({ tenant: { $in: tenantIds }, deleted: false })
        .select('tenant status plan trialEndDate graceEndsAt')
        .populate('plan', 'name price billingCycle employeeLimit')
        .sort({ createdAt: -1 })
        .lean()
    : []
  const subscriptionByTenant = new Map()
  for (const subscription of subscriptions) {
    const key = String(subscription.tenant)
    if (!subscriptionByTenant.has(key)) subscriptionByTenant.set(key, subscription)
  }

  const contentWithBillingStatus = content.map((tenant) => {
    const subscription = subscriptionByTenant.get(String(tenant._id))
    if (!subscription) return tenant
    const lockedLifecycleStatus = ['ARCHIVED', 'PURGE_SCHEDULED', 'PURGED'].includes(tenant.status)
    return {
      ...tenant,
      status: lockedLifecycleStatus ? tenant.status : subscription.status,
      subscriptionStatus: subscription.status,
      trialEndDate: subscription.trialEndDate,
      graceEndsAt: subscription.graceEndsAt,
      plan: subscription.plan || tenant.plan,
    }
  })

  return ok(paged(contentWithBillingStatus, page, size, totalElements))
})
