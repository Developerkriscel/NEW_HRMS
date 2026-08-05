export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Attendance from '@/models/Attendance'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const reason = searchParams.get('reason')

  const attendance = await Attendance.findOne({ _id: params.id, tenantId })
  if (!attendance) return fail('Regularization request not found', 404)

  attendance.regularizationStatus = 'REJECTED'
  attendance.regularizationReason = reason
  attendance.updatedBy = session.sub
  await attendance.save()

  await logAction(session, {
    action: 'REGULARIZATION_REJECTED',
    entityType: 'Attendance',
    entityId: attendance._id,
    description: 'Regularization request rejected',
  })

  return ok(attendance, 'Regularization rejected')
})
