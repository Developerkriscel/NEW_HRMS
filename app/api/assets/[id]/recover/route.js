export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Asset from '@/models/Asset'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { id } = params

  const body = await req.json()
  const { condition, status } = body

  const asset = await Asset.findOne({ _id: id, tenantId })
  if (!asset) return ok({ message: 'Asset not found' }, 404)

  if (asset.status !== 'ASSIGNED') {
    return ok({ message: 'Asset is not currently assigned' }, 400)
  }

  asset.assignedTo = null
  asset.assignedDate = null
  asset.status = status || 'AVAILABLE'
  if (condition) asset.condition = condition
  
  await asset.save()

  return ok(asset)
})
