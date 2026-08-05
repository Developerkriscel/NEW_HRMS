export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Attendance from '@/models/Attendance'

export const PUT = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)

  const attendance = await Attendance.findOne({ _id: params.id, tenantId })
  if (!attendance) return fail('Regularization request not found', 404)

  attendance.regularizationStatus = 'APPROVED'
  attendance.checkInTime = attendance.regularizationCheckIn
  attendance.checkOutTime = attendance.regularizationCheckOut
  attendance.status = 'PRESENT'
  attendance.regularizationApprovedBy = session.userId
  attendance.regularizationApprovedAt = new Date()
  attendance.updatedBy = session.sub
  await attendance.save()

  await logAction(session, {
    action: 'REGULARIZATION_APPROVED',
    entityType: 'Attendance',
    entityId: attendance._id,
    description: 'Regularization request approved',
  })

  return ok(attendance, 'Regularization approved')
})
