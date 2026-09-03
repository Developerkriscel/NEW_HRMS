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
  const selectedEmployeeIds = Array.isArray(body.employeeIds) ? body.employeeIds.filter(Boolean) : []

  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000) {
    return fail('Valid month and year are required', 400)
  }

  const lockedQuery = { tenantId, month, year, status: { $in: ['APPROVED', 'FINALIZED', 'PAID'] } }
  if (selectedEmployeeIds.length > 0) {
    lockedQuery.employee = { $in: selectedEmployeeIds }
  }

  const alreadyLocked = await Payslip.findOne(lockedQuery)
  if (alreadyLocked) {
    return fail('One or more payslips for this period are already approved/finalized/paid and cannot be re-run.', 400)
  }

  const query = { tenantId, deleted: false, status: { $in: ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD'] } }
  if (selectedEmployeeIds.length > 0) {
    query._id = { $in: selectedEmployeeIds }
  }

  const employees = await Employee.find(query).limit(1000)

  let succeeded = 0
  let failed = 0
  const errors = []

  for (const employee of employees) {
    try {
      const calc = await calculatePayslip({ employeeId: employee._id, tenantId, month, year })
      await Payslip.findOneAndUpdate(
        { employee: employee._id, month, year, tenantId },
        {
          $set: { ...calc, status: 'DRAFT', updatedBy: session.sub, tenantId, employee: employee._id, month, year },
          $setOnInsert: { createdBy: session.sub },
        },
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
