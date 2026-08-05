export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, paged } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import TenantProvisioningJob from '@/models/TenantProvisioningJob'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.view')

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 20)
  const status = searchParams.get('status')

  const query = {}
  if (status) query.status = status

  const totalElements = await TenantProvisioningJob.countDocuments(query)
  const content = await TenantProvisioningJob.find(query)
    .populate('tenant', 'companyName tenantCode status')
    .populate('requestedBy', 'name email')
    .sort({ createdAt: -1 })
    .skip(page * size)
    .limit(size)

  return ok(paged(content, page, size, totalElements))
})
