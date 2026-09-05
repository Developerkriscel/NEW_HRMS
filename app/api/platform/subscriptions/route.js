export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, paged } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import Subscription from '@/models/Subscription'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'subscription.view')

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 20)
  const status = searchParams.get('status')
  const tenant = searchParams.get('tenant')

  const query = { deleted: false }
  if (status) query.status = status
  if (tenant) query.tenant = tenant

  const totalElements = await Subscription.countDocuments(query)
  const content = await Subscription.find(query)
    .populate('tenant', 'companyName tenantCode status')
    .populate('plan', 'name billingCycle price')
    .sort({ createdAt: -1 })
    .skip(page * size)
    .limit(size)

  return ok(paged(content, page, size, totalElements))
})
