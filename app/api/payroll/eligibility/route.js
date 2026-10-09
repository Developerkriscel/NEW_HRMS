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

import '@/models/Department'
import '@/models/Designation'

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
  const totalDaysInMonth = new Date(year, month, 0).getDate()

  // 1. Get employees who were active during this payroll period
  const employees = await Employee.find({
    tenantId,
    deleted: false,
    ...employeeActiveDuringPeriodQuery(periodStart, periodEnd),
  })
    .select('firstName lastName employeeCode ctc department designation joiningDate')
    .populate('department', 'name')
    .populate('designation', 'name title')
    .lean()

  const employeeIds = employees.map(e => e._id)

  // 2. Find salary structures
  const structures = await SalaryStructure.find({
    employee: { $in: employeeIds },
    tenantId,
    ...salaryStructureEffectiveDuringPeriodQuery(periodStart, periodEnd),
  }).lean()
  const structureMap = new Map(structures.map(s => [s.employee.toString(), s]))

  const missingSalary = []
  employees.forEach(emp => {
    const hasStructure = structureMap.has(emp._id.toString())
    if (!hasStructure && (!emp.ctc || emp.ctc <= 0)) {
      missingSalary.push({ _id: emp._id, name: `${emp.firstName} ${emp.lastName}`, code: emp.employeeCode })
    }
  })

  // 3. Find attendance summary for each employee
  const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0)
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)
  
  const attendanceRecords = await Attendance.find({
    tenantId,
    date: { $gte: monthStart, $lte: monthEnd },
    employee: { $in: employeeIds },
    deleted: false,
  }).select('employee status date').lean()
  
  const attendanceMap = new Map()
  for (const record of attendanceRecords) {
    const empIdStr = record.employee.toString()
    if (!attendanceMap.has(empIdStr)) {
      attendanceMap.set(empIdStr, {
        presentDays: 0,
        halfDays: 0,
        leaveDays: 0,
        absentDays: 0,
        totalLogged: 0,
      })
    }
    const stat = attendanceMap.get(empIdStr)
    stat.totalLogged++
    if (record.status === 'PRESENT' || record.status === 'WFH') {
      stat.presentDays++
    } else if (record.status === 'HALF_DAY') {
      stat.halfDays++
    } else if (record.status === 'ON_LEAVE') {
      stat.leaveDays++
    } else if (record.status === 'ABSENT' || record.status === 'NOT_MARKED') {
      stat.absentDays++
    }
  }

  const missingAttendance = []
  employees.forEach(emp => {
    const att = attendanceMap.get(emp._id.toString())
    if (!att || att.totalLogged === 0) {
      missingAttendance.push({ _id: emp._id, name: `${emp.firstName} ${emp.lastName}`, code: emp.employeeCode })
    }
  })

  // 4. Find all existing payslips for the month (locked vs draft)
  const existingPayslips = await Payslip.find({
    tenantId,
    month,
    year,
    deleted: false,
    employee: { $in: employeeIds },
  })
    .select('employee status netSalary grossSalary updatedAt paymentDate')
    .lean()

  const payslipMap = new Map(existingPayslips.map(p => [p.employee.toString(), p]))
  const lockedEmployeeIds = new Set(
    existingPayslips
      .filter(p => LOCKED_PAYSLIP_STATUSES.includes(p.status))
      .map(p => p.employee.toString())
  )
  const missingSalaryIds = new Set(missingSalary.map(e => e._id.toString()))

  const employeeById = new Map(employees.map(e => [e._id.toString(), e]))
  const blockedPayslips = existingPayslips
    .filter(p => LOCKED_PAYSLIP_STATUSES.includes(p.status))
    .map(payslip => {
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

  // 5. Build rich employee list for frontend selection & review
  const employeeList = employees.map(emp => {
    const empIdStr = emp._id.toString()
    const att = attendanceMap.get(empIdStr) || { presentDays: 0, halfDays: 0, leaveDays: 0, absentDays: 0, totalLogged: 0 }
    const payslip = payslipMap.get(empIdStr)
    const structure = structureMap.get(empIdStr)
    const ctc = Number(structure?.ctc || emp.ctc || 0)
    const monthlyCtc = Math.round(ctc / 12)
    const hasSalary = !missingSalaryIds.has(empIdStr)
    const isLocked = lockedEmployeeIds.has(empIdStr)
    const isDraft = payslip?.status === 'DRAFT'
    const isProcessable = hasSalary && !isLocked

    const effectiveDays = att.presentDays + (att.halfDays * 0.5) + att.leaveDays
    const payableDays = Math.max(0, Math.min(totalDaysInMonth, totalDaysInMonth - att.absentDays))

    return {
      _id: emp._id,
      name: `${emp.firstName} ${emp.lastName}`,
      code: emp.employeeCode || '',
      department: emp.department?.name || '',
      designation: emp.designation?.title || emp.designation?.name || '',
      ctc,
      monthlyCtc,
      presentDays: att.presentDays,
      halfDays: att.halfDays,
      leaveDays: att.leaveDays,
      absentDays: att.absentDays,
      totalLogged: att.totalLogged,
      effectiveDays,
      payableDays,
      payslipStatus: payslip?.status || null,
      isLocked,
      isDraft,
      hasSalary,
      isProcessable,
    }
  })

  const totalSalaryEligible = employees.length - missingSalary.length
  const totalProcessable = employeeList.filter(e => e.isProcessable).length

  return ok({
    totalEmployees: employees.length,
    totalEligible: Math.max(0, totalSalaryEligible),
    totalProcessable: Math.max(0, totalProcessable),
    totalDaysInMonth,
    employees: employeeList,
    missingSalary,
    missingAttendance,
    blockedPayslips,
  })
})
