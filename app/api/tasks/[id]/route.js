export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Task from '@/models/Task'

function canAccess(session, task) {
  const isAssignee = String(task.assignedTo?._id || task.assignedTo) === session.userId
  const isAssigner = String(task.assignedBy?._id || task.assignedBy) === session.userId
  return isAssignee || isAssigner || ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)
}

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const task = await Task.findOne({ _id: params.id, tenantId })
    .populate('assignedTo', 'firstName lastName employeeCode')
    .populate('assignedBy', 'firstName lastName')
    .populate('comments.by', 'firstName lastName')
  if (!task) return fail('Task not found', 404)
  if (!canAccess(session, task)) return fail('You do not have access to this task', 403)
  return ok(task)
})

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const task = await Task.findOne({ _id: params.id, tenantId })
  if (!task) return fail('Task not found', 404)
  if (String(task.assignedBy) !== session.userId && !['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return fail('Only the assigning manager can edit this task', 403)
  }

  for (const field of ['title', 'description', 'priority', 'startDate', 'dueDate']) {
    if (body[field] !== undefined) task[field] = body[field]
  }
  if (body.checklist !== undefined) task.checklist = body.checklist
  task.updatedBy = session.sub
  await task.save()

  await logAction(session, {
    action: 'TASK_UPDATED',
    entityType: 'Task',
    entityId: task._id,
    description: `Task "${task.title}" updated`,
  })

  return ok(task, 'Task updated')
})
