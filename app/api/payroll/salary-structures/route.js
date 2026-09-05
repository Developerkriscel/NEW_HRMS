export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Employee from '@/models/Employee'
import SalaryStructure from '@/models/SalaryStructure'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'FINANCE', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')?.trim()
  const status = searchParams.get('status') || 'ALL'

  const employeeQuery = {
    tenantId,
    deleted: false,
    status: { $in: ['ACTIVE', 'PROBATION', 'NOTICE_PERIOD'] },
  }
  if (search) {
    employeeQuery.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { employeeCode: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ]
  }

  const employees = await Employee.find(employeeQuery)
    .select('firstName lastName employeeCode email status ctc basicSalary department designation branch')
    .populate('department', 'name')
    .populate('designation', 'name')
    .populate('branch', 'name city state')
    .sort({ firstName: 1, lastName: 1 })
    .lean()

  const employeeIds = employees.map((employee) => employee._id)
  const structures = await SalaryStructure.find({
    tenantId,
    employee: { $in: employeeIds },
    isActive: true,
    approvalStatus: 'APPROVED',
    deleted: false,
  }).lean()
  const structureByEmployee = new Map(structures.map((structure) => [String(structure.employee), structure]))

  const rows = employees.map((employee) => {
    const structure = structureByEmployee.get(String(employee._id))
    const hasEmployeeCtc = Number(employee.ctc || 0) > 0
    const setupStatus = structure ? 'STRUCTURED' : hasEmployeeCtc ? 'CTC_ONLY' : 'MISSING'
    return {
      employee,
      structure: structure || null,
      setupStatus,
      annualCtc: Number(structure?.ctc || employee.ctc || 0),
      source: structure ? 'Salary Structure' : hasEmployeeCtc ? 'Employee CTC' : 'Missing',
    }
  }).filter((row) => status === 'ALL' || row.setupStatus === status)

  return ok({
    rows,
    totals: {
      total: rows.length,
      structured: rows.filter((row) => row.setupStatus === 'STRUCTURED').length,
      ctcOnly: rows.filter((row) => row.setupStatus === 'CTC_ONLY').length,
      missing: rows.filter((row) => row.setupStatus === 'MISSING').length,
    },
  })
})
