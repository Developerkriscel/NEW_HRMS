export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Asset from '@/models/Asset'
import Employee from '@/models/Employee'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const employeeId = searchParams.get('employeeId')

  const query = { tenantId }
  const myAssets = searchParams.get('myAssets') === 'true'

  if (session.role === 'EMPLOYEE' || myAssets) {
    query.assignedTo = session.userId
  } else if (session.role === 'MANAGER') {
    const reports = await Employee.find({ reportingManager: session.userId, tenantId, deleted: false }).select('_id')
    query.assignedTo = { $in: reports.map((r) => r._id) }
  } else {
    await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN'])
    if (employeeId) query.assignedTo = employeeId
  }

  const assets = await Asset.find(query).populate('assignedTo', 'firstName lastName employeeCode').sort({ createdAt: -1 })
  return ok(assets)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const body = await req.json()
  const { assetTag, name, category, condition } = body

  if (!assetTag || !name) {
    return ok({ message: 'Asset Tag and Name are required' }, 400)
  }

  // Check for duplicate assetTag
  const existing = await Asset.findOne({ tenantId, assetTag })
  if (existing) {
    return ok({ message: 'Asset with this tag already exists' }, 400)
  }

  const asset = await Asset.create({
    tenantId,
    assetTag,
    name,
    category,
    condition: condition || 'Good',
    status: 'AVAILABLE'
  })

  return ok(asset)
})
