export const dynamic = 'force-dynamic'

import mongoose from 'mongoose'
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

  if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000) {
    return ok({ ...paged([], page, size, 0), totalGross: 0, totalNet: 0, totalDeductions: 0 })
  }

  const status = searchParams.get('status')
  const departmentId = searchParams.get('department')
  const search = searchParams.get('search')

  const query = { tenantId, month, year, deleted: false }
  if (status && status !== 'ALL') {
    query.status = status
  }
  
  let employeeIds = null
  if (search || departmentId) {
    const empQuery = { tenantId, deleted: false }
    if (departmentId && departmentId !== 'ALL') empQuery.department = departmentId
    if (search) {
      empQuery.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { employeeCode: { $regex: search, $options: 'i' } }
      ]
    }
    const emps = await mongoose.model('Employee').find(empQuery).select('_id')
    employeeIds = emps.map(e => e._id)
    query.employee = { $in: employeeIds }
  }

  const totalElements = await Payslip.countDocuments(query)
  const content = await Payslip.find(query)
    .populate({
      path: 'employee',
      select: 'firstName lastName employeeCode department',
      populate: { path: 'department', select: 'name' }
    })
    .skip(page * size)
    .limit(size)
    .sort({ createdAt: -1 })

  // Mongoose does not cast types in aggregate pipelines. Manually cast tenantId.
  const aggQuery = { ...query, tenantId: new mongoose.Types.ObjectId(tenantId) }
  
  // For accurate totals, aggregate the entire filtered query
  const totals = await Payslip.aggregate([
    { $match: aggQuery },
    { $group: { _id: null, totalGross: { $sum: '$grossSalary' }, totalNet: { $sum: '$netSalary' }, totalDeductions: { $sum: '$totalDeductions' } } }
  ])

  const totalGross = totals[0]?.totalGross || 0
  const totalNet = totals[0]?.totalNet || 0
  const totalDeductions = totals[0]?.totalDeductions || 0

  return ok({ ...paged(content, page, size, totalElements), totalGross, totalNet, totalDeductions })
})
