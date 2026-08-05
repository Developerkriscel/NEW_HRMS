export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Shift from '@/models/Shift'

export const GET = withApi(async () => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const shifts = await Shift.find({ tenantId, deleted: false }).sort({ name: 1 })
  return ok(shifts)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const shift = await Shift.create({
    name: body.name,
    startTime: body.startTime,
    endTime: body.endTime,
    gracePeriodMinutes: body.gracePeriodMinutes ?? 0,
    active: body.active ?? true,
    tenantId,
    createdBy: session.sub,
  })

  return ok(shift, 'Shift created', 201)
})
