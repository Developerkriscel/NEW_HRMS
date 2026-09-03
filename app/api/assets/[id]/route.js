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
  const { assetTag, name, category, condition } = body

  const asset = await Asset.findOne({ _id: id, tenantId })
  if (!asset) return ok({ message: 'Asset not found' }, 404)

  if (assetTag && assetTag !== asset.assetTag) {
    const existing = await Asset.findOne({ tenantId, assetTag })
    if (existing) return ok({ message: 'Asset with this tag already exists' }, 400)
    asset.assetTag = assetTag
  }

  if (name) asset.name = name
  if (category) asset.category = category
  if (condition) asset.condition = condition

  await asset.save()
  return ok(asset)
})

export const DELETE = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { id } = params

  const asset = await Asset.findOne({ _id: id, tenantId })
  if (!asset) return ok({ message: 'Asset not found' }, 404)

  if (asset.status === 'ASSIGNED') {
    return ok({ message: 'Cannot delete an assigned asset. Recover it first.' }, 400)
  }

  await asset.deleteOne()
  return ok({ message: 'Asset deleted' })
})
