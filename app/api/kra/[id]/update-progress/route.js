export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Kra from '@/models/Kra'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const kra = await Kra.findOne({ _id: params.id, tenantId })
  if (!kra) return fail('KRA not found', 404)

  const isOwner = String(kra.employee) === session.userId
  const isAssigner = String(kra.assignedBy) === session.userId
  if (!isOwner && !isAssigner) return fail('You cannot update progress on this KRA', 403)

  kra.updates.push({
    date: new Date(),
    note: body.note || '',
    progressPercent: body.progressPercent,
    addedBy: session.userId,
  })
  if (body.progressPercent !== undefined) kra.progressPercent = body.progressPercent
  if (kra.status === 'NOT_STARTED') kra.status = 'IN_PROGRESS'
  if (body.submit) kra.status = 'SUBMITTED'
  kra.updatedBy = session.sub
  await kra.save()

  await logAction(session, {
    action: 'KRA_PROGRESS_UPDATED',
    entityType: 'Kra',
    entityId: kra._id,
    description: `Progress update on KRA "${kra.title}"`,
  })

  return ok(kra, 'Progress updated')
})
