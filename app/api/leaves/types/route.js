export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import LeaveType from '@/models/LeaveType'

export const GET = withApi(async () => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  let types = await LeaveType.find({ tenantId, active: true, deleted: false }).sort({ name: 1 })

  if (types.length === 0) {
    const defaultTypes = [
      { name: 'Sick Leave', code: 'SL', defaultDays: 12, paidLeave: true, tenantId, createdBy: session.sub },
      { name: 'Casual Leave', code: 'CL', defaultDays: 12, paidLeave: true, tenantId, createdBy: session.sub },
      { name: 'Earned Leave', code: 'EL', defaultDays: 15, paidLeave: true, tenantId, createdBy: session.sub }
    ]
    await LeaveType.insertMany(defaultTypes)
    types = await LeaveType.find({ tenantId, active: true, deleted: false }).sort({ name: 1 })
  }

  return ok(types)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const leaveType = await LeaveType.create({
    name: body.name,
    code: body.code,
    description: body.description,
    defaultDays: body.defaultDays,
    carryForward: body.carryForward,
    maxCarryForward: body.maxCarryForward,
    encashable: body.encashable,
    paidLeave: body.paidLeave,
    requiresApproval: body.requiresApproval,
    tenantId,
    createdBy: session.sub,
  })

  return ok(leaveType, 'Leave type created', 201)
})
