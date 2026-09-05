export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { PREBOARDING_VIEW_ROLES, canManagePreboarding } from '@/lib/preboardingConstants'
import { syncReadinessStatus } from '@/lib/candidateEmployeeConversionService'
import Preboarding from '@/models/Preboarding'
import PreboardingTask from '@/models/PreboardingTask'

export const PATCH = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  if (!canManagePreboarding(session)) return fail('You do not have permission to update onboarding tasks', 403, 'FORBIDDEN')

  const body = await req.json()
  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')

  const patch = {}
  if (body.name !== undefined) patch.name = body.name.trim()
  if (body.assignedTo !== undefined) patch.assignedTo = body.assignedTo.trim() || 'HR Department'
  if (body.dueDate !== undefined) patch.dueDate = body.dueDate ? new Date(body.dueDate) : null
  if (body.priority !== undefined && ['Low', 'Medium', 'High'].includes(body.priority)) patch.priority = body.priority
  if (body.required !== undefined) patch.required = !!body.required
  if (body.status !== undefined) {
    if (!['PENDING', 'IN_PROGRESS', 'COMPLETED'].includes(body.status)) return fail('Invalid task status', 400, 'VALIDATION_ERROR')
    patch.status = body.status
    patch.completedAt = body.status === 'COMPLETED' ? new Date() : null
    patch.completedByName = body.status === 'COMPLETED' ? (session.name || session.sub) : null
  }

  const task = await PreboardingTask.findOneAndUpdate(
    { _id: params.taskId, tenantId, preboardingId: params.id, deleted: false },
    { $set: patch },
    { new: true }
  )
  if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND')

  preboarding.activityLog.push({
    type: 'TASK_UPDATED',
    message: `${task.name} marked ${task.status.toLowerCase()}`,
    actorName: session.name || session.sub,
  })
  await preboarding.save()
  await syncReadinessStatus(tenantId, preboarding._id)

  return ok(task, 'Task updated')
})

export const DELETE = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  if (!canManagePreboarding(session)) return fail('You do not have permission to delete onboarding tasks', 403, 'FORBIDDEN')

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')

  const task = await PreboardingTask.findOneAndUpdate(
    { _id: params.taskId, tenantId, preboardingId: params.id, deleted: false },
    { $set: { deleted: true } },
    { new: true }
  )
  if (!task) throw new ApiError(404, 'Task not found', 'NOT_FOUND')

  preboarding.activityLog.push({
    type: 'TASK_DELETED',
    message: `Task removed: ${task.name}`,
    actorName: session.name || session.sub,
  })
  await preboarding.save()
  await syncReadinessStatus(tenantId, preboarding._id)

  return ok(task, 'Task removed')
})
