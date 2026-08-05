export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import Task from '@/models/Task'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()
  if (!body.text) return fail('text is required', 400)

  const task = await Task.findOne({ _id: params.id, tenantId })
  if (!task) return fail('Task not found', 404)

  const isAssignee = String(task.assignedTo) === session.userId
  const isAssigner = String(task.assignedBy) === session.userId
  if (!isAssignee && !isAssigner && !['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return fail('You cannot comment on this task', 403)
  }

  task.comments.push({ text: body.text, by: session.userId, at: new Date() })
  await task.save()

  return ok(task, 'Comment added')
})
