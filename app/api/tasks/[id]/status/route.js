export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Task from '@/models/Task'

const ASSIGNEE_STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED']
const MANAGER_STATUSES = ['APPROVED', 'REJECTED', 'IN_PROGRESS', 'ON_HOLD']

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const task = await Task.findOne({ _id: params.id, tenantId })
  if (!task) return fail('Task not found', 404)

  const isAssignee = String(task.assignedTo) === session.userId
  const isAssigner = String(task.assignedBy) === session.userId
  const isAdmin = ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)

  if (!isAssignee && !isAssigner && !isAdmin) return fail('You cannot update this task', 403)

  const allowed = isAssigner || isAdmin ? MANAGER_STATUSES : ASSIGNEE_STATUSES
  if (!allowed.includes(body.status)) return fail('Invalid status for your role', 400)

  // Reopen: an assigner/admin can move a task back to IN_PROGRESS from any state.
  task.status = body.status
  task.updatedBy = session.sub
  await task.save()

  await logAction(session, {
    action: 'TASK_STATUS_CHANGED',
    entityType: 'Task',
    entityId: task._id,
    description: `Task "${task.title}" status set to ${body.status}`,
  })

  return ok(task, 'Task status updated')
})
