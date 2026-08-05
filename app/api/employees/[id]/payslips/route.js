export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Payslip from '@/models/Payslip'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  if (session.role === 'EMPLOYEE' && String(params.id) !== session.userId) {
    return fail('You can only view your own payslips', 403)
  }
  const payslips = await Payslip.find({ employee: params.id, tenantId }).sort({ year: -1, month: -1 })
  return ok(payslips)
})
