export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import LeaveRequest from '@/models/LeaveRequest'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const reason = searchParams.get('reason')

  const leaveRequest = await LeaveRequest.findOne({ _id: params.id, tenantId })
  if (!leaveRequest) return fail('Leave request not found', 404)
  if (leaveRequest.status !== 'PENDING') {
    return fail('Only pending leave requests can be rejected', 400)
  }

  leaveRequest.status = 'REJECTED'
  leaveRequest.rejectionReason = reason
  leaveRequest.updatedBy = session.sub
  await leaveRequest.save()

  await logAction(session, {
    action: 'LEAVE_REJECTED',
    entityType: 'LeaveRequest',
    entityId: leaveRequest._id,
    description: 'Leave request rejected',
  })

  return ok(leaveRequest, 'Leave rejected')
})
