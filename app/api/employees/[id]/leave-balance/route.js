export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import LeaveBalance from '@/models/LeaveBalance'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const year = new Date().getFullYear()

  const balances = await LeaveBalance.find({ employee: params.id, tenantId, year }).populate('leaveType')
  return ok(balances)
})
