export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import TrainingSession from '@/models/TrainingSession'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const training = await TrainingSession.findOne({ _id: params.id, tenantId, deleted: false })
  if (!training) return fail('Training not found', 404)

  for (const field of ['title', 'category', 'trainer', 'scheduledAt', 'status', 'attendees', 'notes']) {
    if (body[field] !== undefined) training[field] = field === 'attendees' ? body[field] : body[field]
  }
  if (body.attendeeIds !== undefined) training.attendees = body.attendeeIds
  training.updatedBy = session.sub
  await training.save()

  await logAction(session, {
    action: 'TRAINING_UPDATED',
    entityType: 'TrainingSession',
    entityId: training._id,
    description: `Training "${training.title}" updated`,
  })

  return ok(training, 'Training updated')
})
