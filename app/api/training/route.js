export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import TrainingSession from '@/models/TrainingSession'
import Employee from '@/models/Employee'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const status = new URL(req.url).searchParams.get('status')
  const query = { tenantId, deleted: false }
  if (session.role === 'EMPLOYEE') query.attendees = session.userId
  else await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  if (status) query.status = status

  const sessions = await TrainingSession.find(query)
    .populate('attendees', 'firstName lastName employeeCode')
    .sort({ scheduledAt: -1, createdAt: -1 })

  return ok(sessions)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!body.title) return fail('title is required', 400)

  const attendeeIds = Array.isArray(body.attendeeIds) ? body.attendeeIds : []
  if (attendeeIds.length) {
    const count = await Employee.countDocuments({ _id: { $in: attendeeIds }, tenantId, deleted: false })
    if (count !== attendeeIds.length) return fail('One or more attendees were not found', 400)
  }

  const training = await TrainingSession.create({
    title: body.title,
    category: body.category,
    trainer: body.trainer,
    scheduledAt: body.scheduledAt || null,
    status: body.status || 'PLANNED',
    attendees: attendeeIds,
    notes: body.notes,
    tenantId,
    createdBy: session.sub,
  })

  await logAction(session, {
    action: 'TRAINING_CREATED',
    entityType: 'TrainingSession',
    entityId: training._id,
    description: `Training "${training.title}" created`,
  })

  return ok(training, 'Training created', 201)
})
