export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Employee from '@/models/Employee'
import SalaryStructure from '@/models/SalaryStructure'
import Attendance from '@/models/Attendance'
import Payslip from '@/models/Payslip'

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

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  
  const { searchParams } = new URL(req.url)
  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))

  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000) {
    return fail('Valid month and year are required', 400)
  }

  const { periodStart, periodEnd } = getPayrollWindow(month, year)

  // 1. Get employees who were active during this payroll period
  const employees = await Employee.find({
    tenantId,
    deleted: false,
    ...employeeActiveDuringPeriodQuery(periodStart, periodEnd),
  }).select('firstName lastName employeeCode ctc')

  const employeeIds = employees.map(e => e._id)

  // 2. Find missing salary structures
  const structures = await SalaryStructure.find({
    employee: { $in: employeeIds },
    tenantId,
    isActive: true,
    ctc: { $gt: 0 },
    approvalStatus: 'APPROVED',
    deleted: false,
  })
  const structuredEmpIds = new Set(structures.map(s => s.employee.toString()))
  
  const missingSalary = []
  employees.forEach(emp => {
    if (!structuredEmpIds.has(emp._id.toString())) {
      // If no structure, check if they have a CTC on their profile as a fallback
      if (!emp.ctc || emp.ctc <= 0) {
        missingSalary.push({ _id: emp._id, name: `${emp.firstName} ${emp.lastName}`, code: emp.employeeCode })
      }
    }
  })

  // 3. Find missing attendance (employees with 0 attendance records for the month)
  const monthStart = periodStart
  const monthEnd = periodEnd
  
  const attendanceRecords = await Attendance.aggregate([
    {
      $match: {
        tenantId,
        date: { $gte: monthStart, $lte: monthEnd },
        employee: { $in: employeeIds }
      }
    },
    {
      $group: {
        _id: '$employee',
        count: { $sum: 1 }
      }
    }
  ])
  
  const attendanceMap = new Set(attendanceRecords.map(a => a._id.toString()))
  const missingAttendance = []
  
  employees.forEach(emp => {
    if (!attendanceMap.has(emp._id.toString())) {
      missingAttendance.push({ _id: emp._id, name: `${emp.firstName} ${emp.lastName}`, code: emp.employeeCode })
    }
  })

  const existingPayslips = await Payslip.find({
    tenantId,
    month,
    year,
    deleted: false,
    employee: { $in: employeeIds },
    status: { $in: LOCKED_PAYSLIP_STATUSES },
  })
    .select('employee status netSalary updatedAt paymentDate')
    .lean()

  const employeeById = new Map(employees.map((employee) => [employee._id.toString(), employee]))
  const lockedEmployeeIds = new Set(existingPayslips.map((payslip) => payslip.employee.toString()))
  const missingSalaryIds = new Set(missingSalary.map((employee) => employee._id.toString()))
  const blockedPayslips = existingPayslips.map((payslip) => {
    const employee = employeeById.get(payslip.employee.toString())
    return {
      employeeId: payslip.employee,
      name: employee ? `${employee.firstName} ${employee.lastName}` : 'Employee',
      code: employee?.employeeCode || '',
      status: payslip.status,
      netSalary: payslip.netSalary || 0,
      paymentDate: payslip.paymentDate || null,
      updatedAt: payslip.updatedAt || null,
    }
  })

  const totalSalaryEligible = employees.length - missingSalary.length
  const totalProcessable = employees.filter((employee) => (
    !missingSalaryIds.has(employee._id.toString())
    && !lockedEmployeeIds.has(employee._id.toString())
  )).length

  return ok({
    totalEmployees: employees.length,
    totalEligible: Math.max(0, totalSalaryEligible),
    totalProcessable: Math.max(0, totalProcessable),
    missingSalary,
    missingAttendance,
    blockedPayslips,
  })
})
