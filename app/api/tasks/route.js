export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Task from '@/models/Task'
import Employee from '@/models/Employee'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 50)
  const status = searchParams.get('status')
  const employeeId = searchParams.get('employeeId')
  const delayedOnly = searchParams.get('delayedOnly') === 'true'

  const query = { tenantId }
  if (session.role === 'EMPLOYEE') {
    query.assignedTo = session.userId
  } else if (session.role === 'MANAGER') {
    query.assignedBy = session.userId
    if (employeeId) query.assignedTo = employeeId
  } else {
    await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
    if (employeeId) query.assignedTo = employeeId
  }
  if (status) query.status = status
  if (delayedOnly) {
    query.dueDate = { $lt: new Date() }
    query.status = { $nin: ['COMPLETED', 'APPROVED'] }
  }

  const totalElements = await Task.countDocuments(query)
  const content = await Task.find(query)
    .populate('assignedTo', 'firstName lastName employeeCode')
    .populate('assignedBy', 'firstName lastName')
    .sort({ dueDate: 1 })
    .skip(page * size)
    .limit(size)

  const withOverdue = content.map((t) => {
    const obj = t.toObject()
    obj.isOverdue = t.dueDate && t.dueDate < new Date() && !['COMPLETED', 'APPROVED'].includes(t.status)
    return obj
  })

  return ok(paged(withOverdue, page, size, totalElements))
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!body.assignedTo || !body.title) return fail('assignedTo and title are required', 400)

  if (session.role === 'MANAGER') {
    const employee = await Employee.findOne({ _id: body.assignedTo, tenantId })
    if (!employee || String(employee.reportingManager) !== session.userId) {
      return fail('You can only assign tasks to your own direct reports', 403)
    }
  }

  const task = await Task.create({
    title: body.title,
    description: body.description,
    assignedTo: body.assignedTo,
    assignedBy: session.userId,
    priority: body.priority || 'MEDIUM',
    startDate: body.startDate || null,
    dueDate: body.dueDate || null,
    checklist: (body.checklist || []).map((text) => ({ text, done: false })),
    tenantId,
    createdBy: session.sub,
  })

  await logAction(session, {
    action: 'TASK_ASSIGNED',
    entityType: 'Task',
    entityId: task._id,
    description: `Task "${task.title}" assigned`,
  })

  return ok(task, 'Task assigned', 201)
})
