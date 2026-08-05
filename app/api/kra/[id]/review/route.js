export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Kra from '@/models/Kra'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const kra = await Kra.findOne({ _id: params.id, tenantId })
  if (!kra) return fail('KRA not found', 404)
  if (session.role === 'MANAGER' && String(kra.assignedBy) !== session.userId) {
    return fail('You can only review KRAs you assigned', 403)
  }

  const decision = body.decision // 'APPROVE' | 'SEND_BACK'
  if (!['APPROVE', 'SEND_BACK'].includes(decision)) return fail('decision must be APPROVE or SEND_BACK', 400)

  kra.status = decision === 'APPROVE' ? 'APPROVED' : 'SENT_BACK'
  if (body.managerRemarks !== undefined) kra.managerRemarks = body.managerRemarks
  if (body.rating !== undefined) kra.rating = body.rating
  kra.updatedBy = session.sub
  await kra.save()

  await logAction(session, {
    action: decision === 'APPROVE' ? 'KRA_APPROVED' : 'KRA_SENT_BACK',
    entityType: 'Kra',
    entityId: kra._id,
    description: `KRA "${kra.title}" ${decision === 'APPROVE' ? 'approved' : 'sent back for correction'}`,
  })

  return ok(kra, 'KRA reviewed')
})
