export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, paged } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import Tenant from '@/models/Tenant'
import { devSuperAdminStore } from '@/lib/devSuperAdminStore'

const SORTABLE_FIELDS = new Set(['companyName', 'tenantCode', 'status', 'provisioningStatus', 'createdAt', 'employeeLimit'])

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.view')

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 20)
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const plan = searchParams.get('plan')
  const provisioningStatus = searchParams.get('provisioningStatus')
  const sortBy = SORTABLE_FIELDS.has(searchParams.get('sortBy')) ? searchParams.get('sortBy') : 'createdAt'
  const sortDir = searchParams.get('sortDir') === 'asc' ? 1 : -1

  if (session.devLogin && process.env.NODE_ENV !== 'production') {
    return ok(devSuperAdminStore.listTenants({ page, size, status, search }))
  }

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

  const totalElements = await Tenant.countDocuments(query)
  const content = await Tenant.find(query)
    .populate('plan')
    .sort({ [sortBy]: sortDir })
    .skip(page * size)
    .limit(size)

  return ok(paged(content, page, size, totalElements))
})
