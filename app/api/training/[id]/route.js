export const dynamic = 'force-dynamic'

import mongoose from 'mongoose'
import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import TrainingSession from '@/models/TrainingSession'

function objectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value)) ? new mongoose.Types.ObjectId(String(value)) : value
}

const STATUS_TRANSITIONS = {
  PLANNED: ['PLANNED', 'IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED'],
  PAUSED: ['PAUSED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  COMPLETED: ['COMPLETED'],
  CANCELLED: ['CANCELLED'],
}

function minutesBetween(start, end) {
  if (!start || !end) return 0
  const diff = new Date(end).getTime() - new Date(start).getTime()
  if (!Number.isFinite(diff) || diff <= 0) return 0
  return Math.round(diff / 60000)
}

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN', 'MANAGER'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const training = await TrainingSession.collection.findOne({ _id: objectId(params.id), tenantId: objectId(tenantId), deleted: false })
  if (!training) return fail('Training not found', 404)

  const previousStatus = training.status
  const nextStatus = body.status
  const now = new Date()

  if (nextStatus !== undefined && nextStatus !== previousStatus) {
    const allowed = STATUS_TRANSITIONS[training.status] || [training.status]
    if (!allowed.includes(nextStatus)) {
      return fail(`Training cannot move from ${training.status} to ${nextStatus}`, 400, 'INVALID_STATUS_TRANSITION')
    }
  }

  const set = {}
  for (const field of ['title', 'category', 'trainer', 'scheduledAt', 'status', 'attendees', 'notes']) {
    if (body[field] !== undefined) {
      set[field] = field === 'scheduledAt' && body[field] ? new Date(body[field]) : body[field]
    }
  }
  if (body.attendeeIds !== undefined) set.attendees = body.attendeeIds.map(objectId)

  if (nextStatus && nextStatus !== previousStatus) {
    set.status = nextStatus

    if (nextStatus === 'IN_PROGRESS' && previousStatus === 'PLANNED') {
      set.startedAt = training.startedAt || now
      set.activeStartedAt = now
      set.pausedAt = null
    }

    if (nextStatus === 'PAUSED' && previousStatus === 'IN_PROGRESS') {
      set.totalDurationMinutes = (training.totalDurationMinutes || 0) + minutesBetween(training.activeStartedAt, now)
      set.pausedAt = now
      set.activeStartedAt = null
    }

    if (nextStatus === 'IN_PROGRESS' && previousStatus === 'PAUSED') {
      set.activeStartedAt = now
      set.pausedAt = null
    }

    if (nextStatus === 'COMPLETED') {
      let totalDurationMinutes = training.totalDurationMinutes || 0
      if (previousStatus === 'IN_PROGRESS') {
        totalDurationMinutes += minutesBetween(training.activeStartedAt, now)
      }
      set.totalDurationMinutes = totalDurationMinutes
      set.completedAt = now
      set.activeStartedAt = null
      set.pausedAt = previousStatus === 'PAUSED' ? training.pausedAt : null
    }

    if (nextStatus === 'CANCELLED') {
      set.cancelledAt = now
      set.activeStartedAt = null
    }
  }

  set.updatedBy = session.sub
  set.updatedAt = now

  await TrainingSession.collection.updateOne(
    { _id: objectId(params.id), tenantId: objectId(tenantId), deleted: false },
    { $set: set }
  )
  const updatedTraining = await TrainingSession.collection.findOne({ _id: objectId(params.id), tenantId: objectId(tenantId), deleted: false })

  await logAction(session, {
    action: 'TRAINING_UPDATED',
    entityType: 'TrainingSession',
    entityId: training._id,
    description: `Training "${training.title}" updated`,
  })

  return ok(updatedTraining, 'Training updated')
})
