export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, paged } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import LeaveRequest from '@/models/LeaveRequest'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 10)

  const query = { employee: session.userId, tenantId }
  const totalElements = await LeaveRequest.countDocuments(query)
  const content = await LeaveRequest.find(query)
    .populate('leaveType')
    .sort({ createdAt: -1 })
    .skip(page * size)
    .limit(size)

  return ok(paged(content, page, size, totalElements))
})
