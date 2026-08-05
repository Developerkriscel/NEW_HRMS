export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Asset from '@/models/Asset'
import AssetRequest from '@/models/AssetRequest'

// Employee/manager reports an assigned asset as damaged or lost, and — if
// requested — a REPLACEMENT AssetRequest is opened in the same call so the
// manager's approval queue picks it up immediately.
export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const asset = await Asset.findOne({ _id: params.id, tenantId })
  if (!asset) return fail('Asset not found', 404)

  const isHolder = String(asset.assignedTo) === session.userId
  if (!isHolder && !['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return fail('You cannot report this asset', 403)
  }
  if (!['DAMAGED', 'LOST'].includes(body.status)) return fail('status must be DAMAGED or LOST', 400)

  asset.status = body.status
  asset.condition = body.note || asset.condition
  asset.updatedBy = session.sub
  await asset.save()

  let replacementRequest = null
  if (body.requestReplacement) {
    replacementRequest = await AssetRequest.create({
      requestedFor: asset.assignedTo,
      requestedBy: session.userId,
      assetName: asset.name,
      type: 'REPLACEMENT',
      relatedAsset: asset._id,
      reason: body.note || `Reported ${body.status.toLowerCase()}`,
      tenantId,
      createdBy: session.sub,
    })
  }

  await logAction(session, {
    action: 'ASSET_REPORTED',
    entityType: 'Asset',
    entityId: asset._id,
    description: `Asset "${asset.name}" reported ${body.status.toLowerCase()}`,
  })

  return ok({ asset, replacementRequest }, 'Asset reported')
})
