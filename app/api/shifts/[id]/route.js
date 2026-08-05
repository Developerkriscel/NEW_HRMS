export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Shift from '@/models/Shift'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const shift = await Shift.findOne({ _id: params.id, tenantId, deleted: false })
  if (!shift) return fail('Shift not found', 404)

  if (body.name != null) shift.name = body.name
  if (body.startTime != null) shift.startTime = body.startTime
  if (body.endTime != null) shift.endTime = body.endTime
  if (body.gracePeriodMinutes != null) shift.gracePeriodMinutes = body.gracePeriodMinutes
  if (body.active != null) shift.active = body.active
  shift.updatedBy = session.sub
  await shift.save()

  return ok(shift, 'Shift updated')
})

export const DELETE = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const shift = await Shift.findOne({ _id: params.id, tenantId, deleted: false })
  if (!shift) return fail('Shift not found', 404)

  shift.deleted = true
  shift.updatedBy = session.sub
  await shift.save()

  return ok(null, 'Shift deleted')
})
