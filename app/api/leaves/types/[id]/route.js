export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import LeaveType from '@/models/LeaveType'

const FIELDS = ['name', 'code', 'description', 'defaultDays', 'carryForward', 'maxCarryForward', 'encashable', 'paidLeave', 'active', 'requiresApproval']

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const leaveType = await LeaveType.findOne({ _id: params.id, tenantId, deleted: false })
  if (!leaveType) return fail('Leave type not found', 404)

  for (const field of FIELDS) {
    if (body[field] !== undefined) leaveType[field] = body[field]
  }
  leaveType.updatedBy = session.sub
  await leaveType.save()

  return ok(leaveType, 'Leave type updated')
})
