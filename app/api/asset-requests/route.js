export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import AssetRequest from '@/models/AssetRequest'
import Employee from '@/models/Employee'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 50)
  const status = searchParams.get('status')

  const query = { tenantId }
  if (session.role === 'EMPLOYEE') {
    query.requestedFor = session.userId
  } else if (session.role === 'MANAGER') {
    const reports = await Employee.find({ reportingManager: session.userId, tenantId, deleted: false }).select('_id')
    query.requestedFor = { $in: reports.map((r) => r._id) }
  } else {
    await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN'])
  }
  if (status) query.status = status

  const totalElements = await AssetRequest.countDocuments(query)
  const content = await AssetRequest.find(query)
    .populate('requestedFor', 'firstName lastName employeeCode')
    .populate('requestedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .skip(page * size)
    .limit(size)

  return ok(paged(content, page, size, totalElements))
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()
  if (!body.assetName) return fail('assetName is required', 400)

  let requestedFor = session.userId
  if (session.role === 'MANAGER' && body.requestedFor) {
    const employee = await Employee.findOne({ _id: body.requestedFor, tenantId })
    if (!employee || String(employee.reportingManager) !== session.userId) {
      return fail('You can only request assets for your own direct reports', 403)
    }
    requestedFor = body.requestedFor
  }

  const request = await AssetRequest.create({
    requestedFor,
    requestedBy: session.userId,
    assetName: body.assetName,
    type: body.type || 'NEW',
    reason: body.reason,
    tenantId,
    createdBy: session.sub,
  })

  await logAction(session, {
    action: 'ASSET_REQUESTED',
    entityType: 'AssetRequest',
    entityId: request._id,
    description: `Asset request for "${request.assetName}" submitted`,
  })

  return ok(request, 'Asset request submitted', 201)
})
