export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Payslip from '@/models/Payslip'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'FINANCE', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 20)

  const query = { tenantId, month, year }
  const totalElements = await Payslip.countDocuments(query)
  const content = await Payslip.find(query)
    .populate('employee', 'firstName lastName employeeCode')
    .skip(page * size)
    .limit(size)

  const totalGross = content.reduce((sum, p) => sum + (p.grossSalary || 0), 0)
  const totalNet = content.reduce((sum, p) => sum + (p.netSalary || 0), 0)

  return ok({ ...paged(content, page, size, totalElements), totalGross, totalNet })
})
