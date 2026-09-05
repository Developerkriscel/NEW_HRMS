export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Payslip from '@/models/Payslip'
import Employee from '@/models/Employee'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'FINANCE', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))

  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000) {
    return ok({
      processedCount: 0,
      totalGross: 0,
      totalNet: 0,
      totalDeductions: 0,
      byDepartment: [],
      statutory: { basicSalary: 0, pfDeduction: 0, esiDeduction: 0, tdsDeduction: 0 },
    })
  }

  const employees = await Employee.find({
    tenantId,
    deleted: false,
    status: { $in: ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD'] },
  }).select('_id').lean()
  const employeeIds = employees.map((employee) => employee._id)

  const payslips = await Payslip.find({ tenantId, month, year, deleted: false, employee: { $in: employeeIds } })
    .populate({
      path: 'employee',
      select: 'department',
      populate: { path: 'department', select: 'name' },
    })
    .limit(10000)

  const totals = payslips.reduce(
    (acc, p) => ({
      basicSalary: acc.basicSalary + (p.basicSalary || 0),
      grossSalary: acc.grossSalary + (p.grossSalary || 0),
      netSalary: acc.netSalary + (p.netSalary || 0),
      totalDeductions: acc.totalDeductions + (p.totalDeductions || 0),
      pfDeduction: acc.pfDeduction + (p.pfDeduction || 0),
      esiDeduction: acc.esiDeduction + (p.esiDeduction || 0),
      tdsDeduction: acc.tdsDeduction + (p.tdsDeduction || 0),
    }),
    { basicSalary: 0, grossSalary: 0, netSalary: 0, totalDeductions: 0, pfDeduction: 0, esiDeduction: 0, tdsDeduction: 0 }
  )

  const departmentMap = new Map()
  payslips.forEach((p) => {
    const name = p.employee?.department?.name || 'Unassigned'
    const current = departmentMap.get(name) || { name, count: 0, totalGross: 0, totalNet: 0, totalDeductions: 0 }
    current.count += 1
    current.totalGross += p.grossSalary || 0
    current.totalNet += p.netSalary || 0
    current.totalDeductions += p.totalDeductions || 0
    departmentMap.set(name, current)
  })

  return ok({
    processedCount: payslips.length,
    totalGross: totals.grossSalary,
    totalNet: totals.netSalary,
    totalDeductions: totals.totalDeductions,
    byDepartment: Array.from(departmentMap.values()),
    statutory: {
      basicSalary: totals.basicSalary,
      pfDeduction: totals.pfDeduction,
      esiDeduction: totals.esiDeduction,
      tdsDeduction: totals.tdsDeduction,
    },
  })
})
