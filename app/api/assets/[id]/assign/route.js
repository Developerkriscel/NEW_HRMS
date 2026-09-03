export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Asset from '@/models/Asset'
import Employee from '@/models/Employee'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { id } = params

  const body = await req.json()
  const { employeeId } = body

  if (!employeeId) return ok({ message: 'Employee ID is required' }, 400)

  const asset = await Asset.findOne({ _id: id, tenantId })
  if (!asset) return ok({ message: 'Asset not found' }, 404)

  if (asset.status !== 'AVAILABLE') {
    return ok({ message: 'Asset is not available for assignment' }, 400)
  }

  const employee = await Employee.findOne({ _id: employeeId, tenantId })
  if (!employee) return ok({ message: 'Employee not found' }, 404)

  asset.assignedTo = employeeId
  asset.assignedDate = new Date()
  asset.status = 'ASSIGNED'
  await asset.save()

  return ok(asset)
})
