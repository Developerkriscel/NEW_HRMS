export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Payslip from '@/models/Payslip'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const selfServiceRole = ['EMPLOYEE', 'MANAGER'].includes(session.role)
  if (selfServiceRole && String(params.id) !== String(session.userId)) {
    return fail('You can only view your own payslips', 403)
  }
  if (!selfServiceRole && !['HR_MANAGER', 'FINANCE', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return fail('You do not have permission to view payslips', 403)
  }
  const query = { employee: params.id, tenantId, deleted: false }
  if (selfServiceRole) {
    query.status = { $in: ['FINALIZED', 'PAID'] }
  }
  const payslips = await Payslip.find(query).sort({ year: -1, month: -1 })
  return ok(payslips)
})
