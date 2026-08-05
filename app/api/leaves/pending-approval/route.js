export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import LeaveRequest from '@/models/LeaveRequest'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 20)

  const query = { approvedBy: session.userId, status: 'PENDING', tenantId }
  const totalElements = await LeaveRequest.countDocuments(query)
  const content = await LeaveRequest.find(query)
    .populate('leaveType')
    .populate('employee', 'firstName lastName employeeCode')
    .sort({ createdAt: -1 })
    .skip(page * size)
    .limit(size)

  return ok(paged(content, page, size, totalElements))
})
