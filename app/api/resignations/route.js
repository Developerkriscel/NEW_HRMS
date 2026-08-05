export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Resignation from '@/models/Resignation'
import Employee from '@/models/Employee'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 50)
  const status = searchParams.get('status')

  const query = { tenantId }
  if (session.role === 'EMPLOYEE') {
    query.$or = [{ employee: session.userId }, { handoverEmployee: session.userId }]
  } else if (session.role === 'MANAGER') {
    const reports = await Employee.find({ reportingManager: session.userId, tenantId, deleted: false }).select('_id')
    query.employee = { $in: reports.map((r) => r._id) }
  } else {
    await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  }
  if (status) query.status = status

  const totalElements = await Resignation.countDocuments(query)
  const content = await Resignation.find(query)
    .populate('employee', 'firstName lastName employeeCode')
    .populate('handoverEmployee', 'firstName lastName')
    .sort({ createdAt: -1 })
    .skip(page * size)
    .limit(size)

  return ok(paged(content, page, size, totalElements))
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()
  if (!body.resignationDate) return fail('resignationDate is required', 400)

  const existing = await Resignation.findOne({
    employee: session.userId,
    tenantId,
    status: { $nin: ['REJECTED'] },
  })
  if (existing) return fail('You already have an active resignation on file', 400)

  const resignation = await Resignation.create({
    employee: session.userId,
    resignationDate: body.resignationDate,
    lastWorkingDate: body.lastWorkingDate || null,
    reason: body.reason,
    tenantId,
    createdBy: session.sub,
  })

  await logAction(session, {
    action: 'RESIGNATION_SUBMITTED',
    entityType: 'Resignation',
    entityId: resignation._id,
    description: 'Resignation submitted',
  })

  return ok(resignation, 'Resignation submitted', 201)
})
