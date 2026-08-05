export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Payslip from '@/models/Payslip'

// Fixes a cross-tenant-leak bug in the original (which never checked
// tenantId here, so any authenticated user could read any other tenant's
// payslip by guessing an employeeId) — this now always scopes by tenantId.
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))

  if (session.role === 'EMPLOYEE' && String(params.employeeId) !== session.userId) {
    return fail('You can only view your own payslip', 403)
  }

  const payslip = await Payslip.findOne({ employee: params.employeeId, month, year, tenantId })
    .populate('employee', 'firstName lastName employeeCode')
  if (!payslip) return fail('Payslip not found', 404)

  return ok(payslip)
})
