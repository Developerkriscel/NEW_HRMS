export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import LeaveRequest from '@/models/LeaveRequest'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)

  const leaveRequest = await LeaveRequest.findOne({ _id: params.id, tenantId })
    .populate('leaveType')
    .populate('employee', 'firstName lastName')
  if (!leaveRequest) return fail('Leave request not found', 404)

  return ok(leaveRequest)
})
