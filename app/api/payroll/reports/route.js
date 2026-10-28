export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Payslip from '@/models/Payslip'
import '@/models/Department'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'FINANCE', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const month = Number(searchParams.get('month'))
  const year = Number(searchParams.get('year'))
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const employeeId = searchParams.get('employeeId')

  const monthKeys = []
  if (from || to) {
    const start = from ? new Date(`${from}T00:00:00`) : new Date(year, month - 1, 1)
    const end = to ? new Date(`${to}T00:00:00`) : start
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)
    while (cursor <= endMonth) {
      monthKeys.push({ month: cursor.getMonth() + 1, year: cursor.getFullYear() })
      cursor.setMonth(cursor.getMonth() + 1)
    }
  } else if (Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(year) && year >= 2000) {
    monthKeys.push({ month, year })
  }
  if (!monthKeys.length) {
    return ok({
      processedCount: 0,
      totalGross: 0,
      totalNet: 0,
      totalDeductions: 0,
      byDepartment: [],
      statutory: { basicSalary: 0, pfDeduction: 0, esiDeduction: 0, tdsDeduction: 0 },
    })
  }

  const query = { tenantId, deleted: false, $or: monthKeys }
  if (employeeId && employeeId !== 'all') query.employee = employeeId
  const payslips = await Payslip.find(query)
    .populate({
      path: 'employee',
      select: 'firstName lastName employeeCode department',
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
    const departmentId = p.employee?.department?._id ? String(p.employee.department._id) : 'UNASSIGNED'
    const key = departmentId
    const current = departmentMap.get(key) || { id: departmentId, name, count: 0, paidCount: 0, totalGross: 0, totalNet: 0, paidNet: 0, totalDeductions: 0 }
    current.count += 1
    if (p.status === 'PAID') {
      current.paidCount += 1
      current.paidNet += p.netSalary || 0
    }
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
    byDepartment: Array.from(departmentMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
    records: payslips.map((payslip) => ({
      _id: payslip._id,
      employeeId: payslip.employee?._id || payslip.employee,
      employeeName: payslip.employee ? `${payslip.employee.firstName || ''} ${payslip.employee.lastName || ''}`.trim() : 'Unknown Employee',
      employeeCode: payslip.employee?.employeeCode || '',
      month: payslip.month,
      year: payslip.year,
      grossSalary: payslip.grossSalary || 0,
      totalDeductions: payslip.totalDeductions || 0,
      netSalary: payslip.netSalary || 0,
      status: payslip.status,
    })),
    statutory: {
      basicSalary: totals.basicSalary,
      pfDeduction: totals.pfDeduction,
      esiDeduction: totals.esiDeduction,
      tdsDeduction: totals.tdsDeduction,
    },
  })
})
