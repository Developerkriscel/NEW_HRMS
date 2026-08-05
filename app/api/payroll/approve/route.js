export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
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

  const result = await Payslip.updateMany(
    { tenantId, month, year, status: 'DRAFT' },
    { status: 'APPROVED', updatedBy: session.sub }
  )

  await logAction(session, {
    action: 'PAYROLL_APPROVED',
    entityType: 'Payslip',
    description: `Payroll approved for ${month}/${year}`,
  })

  return ok({ updatedCount: result.modifiedCount }, 'Payroll approved')
})
