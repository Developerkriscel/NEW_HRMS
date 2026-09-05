export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { PREBOARDING_VIEW_ROLES, canManagePreboarding } from '@/lib/preboardingConstants'
import { syncReadinessStatus } from '@/lib/candidateEmployeeConversionService'
import { ensureDefaultPreboardingTasks } from '@/lib/preboardingTaskHelpers'
import Preboarding from '@/models/Preboarding'
import PreboardingTask from '@/models/PreboardingTask'

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')
  await ensureDefaultPreboardingTasks(tenantId, preboarding)

  const tasks = await PreboardingTask.find({ tenantId, preboardingId: params.id, deleted: false }).sort({ dueDate: 1, createdAt: 1 }).lean()
  return ok(tasks)
})

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  if (!canManagePreboarding(session)) return fail('You do not have permission to add onboarding tasks', 403, 'FORBIDDEN')

  const body = await req.json()
  if (!body.name?.trim()) return fail('Task name is required', 400, 'VALIDATION_ERROR')

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')

  const task = await PreboardingTask.create({
    tenantId,
    preboardingId: preboarding._id,
    name: body.name.trim(),
    assignedTo: body.assignedTo?.trim() || 'HR Department',
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    priority: ['Low', 'Medium', 'High'].includes(body.priority) ? body.priority : 'Medium',
    required: body.required !== false,
  })

  preboarding.activityLog.push({
    type: 'TASK_ADDED',
    message: `Task added: ${task.name}`,
    actorName: session.name || session.sub,
  })
  await preboarding.save()
  await syncReadinessStatus(tenantId, preboarding._id)

  return ok(task, 'Task added', 201)
})
