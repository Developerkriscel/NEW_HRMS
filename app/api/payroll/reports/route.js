export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Payslip from '@/models/Payslip'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'FINANCE', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))

  const payslips = await Payslip.find({ tenantId, month, year }).limit(10000)

  const totals = payslips.reduce(
    (acc, p) => ({
      basicSalary: acc.basicSalary + (p.basicSalary || 0),
      grossSalary: acc.grossSalary + (p.grossSalary || 0),
      netSalary: acc.netSalary + (p.netSalary || 0),
      pfDeduction: acc.pfDeduction + (p.pfDeduction || 0),
      esiDeduction: acc.esiDeduction + (p.esiDeduction || 0),
      tdsDeduction: acc.tdsDeduction + (p.tdsDeduction || 0),
    }),
    { basicSalary: 0, grossSalary: 0, netSalary: 0, pfDeduction: 0, esiDeduction: 0, tdsDeduction: 0 }
  )

  return ok(totals)
})
