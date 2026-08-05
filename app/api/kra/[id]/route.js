export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Kra from '@/models/Kra'

async function loadScoped(session, tenantId, id) {
  const kra = await Kra.findOne({ _id: id, tenantId })
    .populate('employee', 'firstName lastName employeeCode')
    .populate('assignedBy', 'firstName lastName')
  if (!kra) return null
  const isOwner = String(kra.employee?._id || kra.employee) === session.userId
  const isAssigner = String(kra.assignedBy?._id || kra.assignedBy) === session.userId
  if (!isOwner && !isAssigner && !['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return 'forbidden'
  }
  return kra
}

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const kra = await loadScoped(session, tenantId, params.id)
  if (kra === null) return fail('KRA not found', 404)
  if (kra === 'forbidden') return fail('You do not have access to this KRA', 403)
  return ok(kra)
})

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const kra = await Kra.findOne({ _id: params.id, tenantId })
  if (!kra) return fail('KRA not found', 404)
  if (String(kra.assignedBy) !== session.userId && !['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return fail('Only the assigning manager can edit this KRA', 403)
  }

  for (const field of ['title', 'description', 'startDate', 'dueDate', 'weightage', 'type']) {
    if (body[field] !== undefined) kra[field] = body[field]
  }
  kra.updatedBy = session.sub
  await kra.save()

  await logAction(session, {
    action: 'KRA_UPDATED',
    entityType: 'Kra',
    entityId: kra._id,
    description: `KRA "${kra.title}" updated`,
  })

  return ok(kra, 'KRA updated')
})
