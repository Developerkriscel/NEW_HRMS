export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { calculatePayslip } from '@/lib/payrollCalc'
import Payslip from '@/models/Payslip'
import Employee from '@/models/Employee'

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const body = await req.json().catch(() => ({}))
  const month = Number(searchParams.get('month') || body.month)
  const year = Number(searchParams.get('year') || body.year)

  const alreadyApproved = await Payslip.findOne({ tenantId, month, year, status: 'APPROVED' })
  if (alreadyApproved) {
    return fail('Payroll for this period has already been approved and cannot be re-run', 400)
  }

  const employees = await Employee.find({ tenantId, deleted: false, status: { $in: ['ACTIVE', 'PROBATION'] } }).limit(1000)

  let succeeded = 0
  let failed = 0
  const errors = []

  for (const employee of employees) {
    try {
      const calc = await calculatePayslip({ employeeId: employee._id, tenantId, month, year })
      await Payslip.findOneAndUpdate(
        { employee: employee._id, month, year, tenantId },
        { ...calc, status: 'DRAFT', updatedBy: session.sub, $setOnInsert: { createdBy: session.sub } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      succeeded++
    } catch (err) {
      failed++
      errors.push({ employeeId: employee._id, message: err.message })
    }
  }

  await logAction(session, {
    action: 'PAYROLL_RUN',
    entityType: 'Payslip',
    description: `Payroll run for ${month}/${year}`,
  })

  return ok({ succeeded, failed, errors }, 'Payroll run completed')
})
