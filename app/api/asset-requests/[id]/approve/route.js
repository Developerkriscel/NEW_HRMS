export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import AssetRequest from '@/models/AssetRequest'
import Employee from '@/models/Employee'
import Asset from '@/models/Asset'

function nextAssetTag() {
  return `AST-${Date.now().toString(36).toUpperCase()}`
}

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const request = await AssetRequest.findOne({ _id: params.id, tenantId })
  if (!request) return fail('Asset request not found', 404)
  if (request.status !== 'PENDING') return fail('Only pending requests can be approved', 400)

  if (session.role === 'MANAGER') {
    const employee = await Employee.findOne({ _id: request.requestedFor, tenantId })
    if (!employee || String(employee.reportingManager) !== session.userId) {
      return fail('You can only approve requests for your own direct reports', 403)
    }
  }

  let assignedAsset = null
  if (request.relatedAsset) {
    await Asset.updateOne(
      { _id: request.relatedAsset, tenantId },
      { status: 'RETIRED', updatedBy: session.sub }
    )
  }

  assignedAsset = await Asset.create({
    assetTag: body.assetTag || nextAssetTag(),
    name: body.assetName || request.assetName,
    category: body.category,
    assignedTo: request.requestedFor,
    assignedDate: new Date(),
    status: 'ASSIGNED',
    condition: body.condition || 'Good',
    tenantId,
    createdBy: session.sub,
  })

  request.status = 'APPROVED'
  request.reviewedBy = session.userId
  request.reviewerRemarks = body.remarks
  request.updatedBy = session.sub
  await request.save()

  await logAction(session, {
    action: 'ASSET_REQUEST_APPROVED',
    entityType: 'AssetRequest',
    entityId: request._id,
    description: `Asset request for "${request.assetName}" approved`,
  })

  return ok({ request, asset: assignedAsset }, 'Asset request approved')
})
