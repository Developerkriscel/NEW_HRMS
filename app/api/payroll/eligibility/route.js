export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Employee from '@/models/Employee'
import SalaryStructure from '@/models/SalaryStructure'
import Attendance from '@/models/Attendance'

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

  // 1. Get all active employees
  const employees = await Employee.find({
    tenantId,
    deleted: false,
    status: { $in: ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD'] }
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
  const monthStart = new Date(year, month - 1, 1)
  const monthEnd = new Date(year, month, 0, 23, 59, 59, 999)
  
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

  return ok({
    totalEmployees: employees.length,
    totalEligible: Math.max(0, employees.length - missingSalary.length),
    missingSalary,
    missingAttendance
  })
})
