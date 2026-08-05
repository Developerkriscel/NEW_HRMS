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
  if (session.role === 'EMPLOYEE') {
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
