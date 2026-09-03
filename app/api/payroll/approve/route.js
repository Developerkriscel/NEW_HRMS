export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Payslip from '@/models/Payslip'

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['FINANCE', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const body = await req.json().catch(() => ({}))
  const month = Number(searchParams.get('month') || body.month)
  const year = Number(searchParams.get('year') || body.year)

  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000) {
    return fail('Valid month and year are required', 400)
  }

  const result = await Payslip.updateMany(
    { tenantId, month, year, status: 'REVIEW' },
    { $set: { status: 'APPROVED', updatedBy: session.sub } }
  )

  await logAction(session, {
    action: 'PAYROLL_APPROVED',
    entityType: 'Payslip',
    description: `Payroll approved for ${month}/${year}`,
  })

  return ok({ updatedCount: result.modifiedCount }, 'Payroll approved')
})
