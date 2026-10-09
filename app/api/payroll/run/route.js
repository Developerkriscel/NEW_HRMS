export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { calculatePayslip } from '@/lib/payrollCalc'
import Payslip from '@/models/Payslip'
import Employee from '@/models/Employee'
import SalaryStructure from '@/models/SalaryStructure'

const LOCKED_PAYSLIP_STATUSES = ['PROCESSING', 'REVIEW', 'APPROVED', 'FINALIZED', 'PAID']

function getPayrollWindow(month, year) {
  const periodStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0)
  const today = new Date()
  const periodEnd = today.getFullYear() === year && today.getMonth() === month - 1
    ? new Date(year, month - 1, today.getDate())
    : monthEnd
  periodEnd.setHours(23, 59, 59, 999)
  return { periodStart, periodEnd }
}

function employeeActiveDuringPeriodQuery(periodStart, periodEnd) {
  return {
    status: { $in: ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD'] },
    $and: [
      {
        $or: [
          { joiningDate: { $lte: periodEnd } },
          { joiningDate: null },
          { joiningDate: { $exists: false } },
        ],
      },
      {
        $or: [
          { lastWorkingDate: { $gte: periodStart } },
          { lastWorkingDate: null },
          { lastWorkingDate: { $exists: false } },
        ],
      },
    ],
  }
}

function salaryStructureEffectiveDuringPeriodQuery(periodStart, periodEnd) {
  return {
    approvalStatus: 'APPROVED',
    deleted: false,
    ctc: { $gt: 0 },
    $and: [
      {
        $or: [
          { effectiveFrom: { $lte: periodEnd } },
          { effectiveFrom: null },
          { effectiveFrom: { $exists: false } },
        ],
      },
      {
        $or: [
          { effectiveTo: null },
          { effectiveTo: { $gte: periodStart } },
          { effectiveTo: { $exists: false } },
        ],
      },
    ],
  }
}

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

  const allowOverwrite = Boolean(body.allowOverwrite)

  const protectedQuery = { tenantId, month, year, status: { $in: LOCKED_PAYSLIP_STATUSES }, deleted: false }
  if (selectedEmployeeIds.length > 0) {
    protectedQuery.employee = { $in: selectedEmployeeIds }
  }

  const lockedPayslips = allowOverwrite
    ? []
    : await Payslip.find(protectedQuery).select('employee status').lean()
  const lockedEmployeeIds = new Set(lockedPayslips.map((payslip) => payslip.employee.toString()))

  const { periodStart, periodEnd } = getPayrollWindow(month, year)
  const query = { tenantId, deleted: false, ...employeeActiveDuringPeriodQuery(periodStart, periodEnd) }
  if (selectedEmployeeIds.length > 0) {
    query._id = { $in: selectedEmployeeIds }
  }
  if (lockedEmployeeIds.size > 0) {
    query._id = query._id || {}
    query._id.$nin = Array.from(lockedEmployeeIds)
  }

  const employees = await Employee.find(query).select('firstName lastName employeeCode ctc joiningDate lastWorkingDate').limit(1000)
  if (!employees.length) {
    const lockedStatuses = [...new Set(lockedPayslips.map((payslip) => payslip.status))].join(', ')
    return fail(
      lockedPayslips.length
        ? `No employees can be processed. Existing payslips are locked in ${lockedStatuses}. Cancel eligible draft/review payslips or process a new period.`
        : 'No active employees found for this payroll period.',
      400,
      'NO_PROCESSABLE_EMPLOYEES'
    )
  }

  let succeeded = 0
  let failed = 0
  let skipped = lockedPayslips.length
  const errors = []

  const salaryStructures = await SalaryStructure.find({
    tenantId,
    employee: { $in: employees.map((employee) => employee._id) },
    ...salaryStructureEffectiveDuringPeriodQuery(periodStart, periodEnd),
  }).select('employee').lean()
  const salaryReadyEmployeeIds = new Set(salaryStructures.map((structure) => structure.employee.toString()))
  const processableEmployees = []
  for (const employee of employees) {
    if (salaryReadyEmployeeIds.has(employee._id.toString()) || Number(employee.ctc || 0) > 0) {
      processableEmployees.push(employee)
    } else {
      skipped++
      errors.push({
        employeeId: employee._id,
        employeeCode: employee.employeeCode,
        message: `${employee.firstName} ${employee.lastName}: Salary/CTC is missing. Add salary structure or employee CTC before running payroll.`,
      })
    }
  }

  if (!processableEmployees.length) {
    return fail('No employees can be processed. Add salary structures/employee CTC or choose a period without locked payslips.', 400, 'NO_PROCESSABLE_EMPLOYEES')
  }

  for (const employee of processableEmployees) {
    try {
      const calc = await calculatePayslip({ employeeId: employee._id, tenantId, month, year })
      await Payslip.findOneAndUpdate(
        { employee: employee._id, month, year, tenantId },
        {
          $set: { ...calc, status: 'DRAFT', deleted: false, updatedBy: session.sub, tenantId, employee: employee._id, month, year },
          $setOnInsert: { createdBy: session.sub },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      succeeded++
    } catch (err) {
      failed++
      errors.push({
        employeeId: employee._id,
        employeeCode: employee.employeeCode,
        message: `${employee.firstName} ${employee.lastName}: ${err.message}`,
      })
    }
  }

  await logAction(session, {
    action: 'PAYROLL_RUN',
    entityType: 'Payslip',
    description: `Payroll run for ${month}/${year}`,
  })

  return ok({ succeeded, failed, skipped, errors }, 'Payroll run completed')
})
