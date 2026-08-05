export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import AssetRequest from '@/models/AssetRequest'
import Employee from '@/models/Employee'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const request = await AssetRequest.findOne({ _id: params.id, tenantId })
  if (!request) return fail('Asset request not found', 404)
  if (request.status !== 'PENDING') return fail('Only pending requests can be rejected', 400)

  if (session.role === 'MANAGER') {
    const employee = await Employee.findOne({ _id: request.requestedFor, tenantId })
    if (!employee || String(employee.reportingManager) !== session.userId) {
      return fail('You can only reject requests for your own direct reports', 403)
    }
  }

  request.status = 'REJECTED'
  request.reviewedBy = session.userId
  request.reviewerRemarks = body.remarks
  request.updatedBy = session.sub
  await request.save()

  await logAction(session, {
    action: 'ASSET_REQUEST_REJECTED',
    entityType: 'AssetRequest',
    entityId: request._id,
    description: `Asset request for "${request.assetName}" rejected`,
  })

  return ok(request, 'Asset request rejected')
})
