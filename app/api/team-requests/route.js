export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import TeamRequest from '@/models/TeamRequest'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 50)
  const status = searchParams.get('status')
  const type = searchParams.get('type')

  const query = { tenantId }
  if (session.role === 'EMPLOYEE') {
    query.employee = session.userId
  } else if (session.role === 'MANAGER') {
    const Employee = (await import('@/models/Employee')).default
    const reports = await Employee.find({ reportingManager: session.userId, tenantId, deleted: false }).select('_id')
    query.employee = { $in: reports.map((r) => r._id) }
  } else {
    await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  }
  if (status) query.status = status
  if (type) query.type = type

  const totalElements = await TeamRequest.countDocuments(query)
  const content = await TeamRequest.find(query)
    .populate('employee', 'firstName lastName employeeCode')
    .populate('reviewedBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .skip(page * size)
    .limit(size)

  return ok(paged(content, page, size, totalElements))
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!body.type || !body.reason) return fail('type and reason are required', 400)

  const request = await TeamRequest.create({
    employee: session.userId,
    type: body.type,
    details: body.details || {},
    fromDate: body.fromDate || null,
    toDate: body.toDate || null,
    reason: body.reason,
    tenantId,
    createdBy: session.sub,
  })

  await logAction(session, {
    action: 'TEAM_REQUEST_SUBMITTED',
    entityType: 'TeamRequest',
    entityId: request._id,
    description: `${body.type} request submitted`,
  })

  return ok(request, 'Request submitted', 201)
})
