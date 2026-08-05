export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Kra from '@/models/Kra'
import Employee from '@/models/Employee'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 50)
  const status = searchParams.get('status')
  const employeeId = searchParams.get('employeeId')

  const query = { tenantId }
  if (session.role === 'EMPLOYEE') {
    query.employee = session.userId
  } else if (session.role === 'MANAGER') {
    query.assignedBy = session.userId
    if (employeeId) query.employee = employeeId
  } else {
    await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
    if (employeeId) query.employee = employeeId
  }
  if (status) query.status = status

  const totalElements = await Kra.countDocuments(query)
  const content = await Kra.find(query)
    .populate('employee', 'firstName lastName employeeCode')
    .populate('assignedBy', 'firstName lastName')
    .sort({ dueDate: 1 })
    .skip(page * size)
    .limit(size)

  return ok(paged(content, page, size, totalElements))
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!body.employeeId || !body.title) return fail('employeeId and title are required', 400)

  if (session.role === 'MANAGER') {
    const employee = await Employee.findOne({ _id: body.employeeId, tenantId })
    if (!employee || String(employee.reportingManager) !== session.userId) {
      return fail('You can only assign KRAs to your own direct reports', 403)
    }
  }

  const kra = await Kra.create({
    employee: body.employeeId,
    assignedBy: session.userId,
    title: body.title,
    description: body.description,
    type: body.type || 'KRA',
    startDate: body.startDate || null,
    dueDate: body.dueDate || null,
    weightage: body.weightage || 0,
    tenantId,
    createdBy: session.sub,
  })

  await logAction(session, {
    action: 'KRA_ASSIGNED',
    entityType: 'Kra',
    entityId: kra._id,
    description: `KRA "${kra.title}" assigned`,
  })

  return ok(kra, 'KRA assigned', 201)
})
