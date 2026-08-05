export const dynamic = 'force-dynamic'

import mongoose from 'mongoose'
import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import Employee from '@/models/Employee'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  // Aggregate() pipelines don't get Mongoose's automatic string->ObjectId
  // casting the way find()/countDocuments() do, so $match needs a real
  // ObjectId here or it silently matches nothing.
  const tenantObjectId = new mongoose.Types.ObjectId(tenantId)
  const { searchParams } = new URL(req.url)
  const months = Math.min(24, Math.max(1, Number(searchParams.get('months') || 6)))
  const since = new Date()
  since.setMonth(since.getMonth() - months)
  since.setDate(1)
  since.setHours(0, 0, 0, 0)

  const [totalEmployees, byStatusRaw, byDepartmentRaw, joinersTrendRaw] = await Promise.all([
    Employee.countDocuments({ tenantId, deleted: false }),
    Employee.aggregate([
      { $match: { tenantId: tenantObjectId, deleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Employee.aggregate([
      { $match: { tenantId: tenantObjectId, deleted: false } },
      { $lookup: { from: 'departments', localField: 'department', foreignField: '_id', as: 'dept' } },
      { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
      { $group: { _id: { $ifNull: ['$dept.name', 'Unassigned'] }, count: { $sum: 1 } } },
    ]),
    Employee.aggregate([
      { $match: { tenantId: tenantObjectId, deleted: false, joiningDate: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$joiningDate' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ])

  return ok({
    totalEmployees,
    byStatus: byStatusRaw.map((r) => ({ status: r._id, count: r.count })),
    byDepartment: byDepartmentRaw.map((r) => ({ name: r._id, count: r.count })),
    newJoinersTrend: joinersTrendRaw.map((r) => ({ month: r._id, count: r.count })),
  })
})
