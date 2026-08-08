export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { JOB_VIEW_ROLES, JOB_EDITABLE_STATUSES, canManageJobs, computeRemainingOpenings } from '@/lib/jobConstants'
import { validateAlways } from '@/lib/jobValidation'
import {
  populateJob, getActorName, syncJobSkills, getJobSkills, syncScreeningQuestions, syncApplicationFields,
  syncPipelineStages, getJobRelatedData, applyWritableJobFields, describeMajorChanges,
} from '@/lib/jobHelpers'
import Job from '@/models/Job'

async function loadJob(tenantId, id) {
  const job = await populateJob(Job.findOne({ _id: id, tenantId, deleted: false }))
  if (!job) throw new ApiError(404, 'Job opening not found', 'NOT_FOUND')
  return job
}

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const job = await loadJob(tenantId, params.id)
  const related = await getJobRelatedData(tenantId, job._id)
  return ok({ ...job.toObject(), ...related, remainingOpenings: computeRemainingOpenings(job) })
})

export const PATCH = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!canManageJobs(session)) {
    return fail('You do not have permission to edit job openings', 403, 'FORBIDDEN')
  }

  const job = await loadJob(tenantId, params.id)
  // Rule 8 — only DRAFT/OPEN/PAUSED are editable at all; CLOSED/FILLED/CANCELLED are terminal.
  if (!JOB_EDITABLE_STATUSES.includes(job.status)) {
    return fail('This job opening is no longer editable', 400, 'NOT_EDITABLE')
  }

  const merged = { ...job.toObject(), ...body }
  const fieldErrors = validateAlways(merged)
  if (Object.keys(fieldErrors).length) return fail('Please fix the highlighted fields', 400, 'VALIDATION_ERROR', { errors: fieldErrors })

  const majorChangeMessages = describeMajorChanges(job, body)
  applyWritableJobFields(job, body)
  job.updatedBy = session.sub

  const actorName = await getActorName(session)
  if (majorChangeMessages.length) {
    for (const message of majorChangeMessages) {
      job.activityLog.push({ type: 'UPDATED', message, actorId: session.userId, actorName })
    }
  } else {
    job.activityLog.push({ type: 'UPDATED', message: job.status === 'DRAFT' ? 'Draft updated' : 'Job details updated', actorId: session.userId, actorName })
  }
  await job.save()

  if (body.requiredSkills !== undefined || body.preferredSkills !== undefined) {
    const before = await getJobSkills(tenantId, job._id)
    await syncJobSkills(tenantId, job._id, body.requiredSkills ?? before.requiredSkills, body.preferredSkills ?? before.preferredSkills)
  }
  if (body.screeningQuestions !== undefined) await syncScreeningQuestions(tenantId, job._id, body.screeningQuestions)
  if (body.applicationFields !== undefined) await syncApplicationFields(tenantId, job._id, body.applicationFields)
  if (body.pipelineStages !== undefined) await syncPipelineStages(tenantId, job._id, body.pipelineStages, job.pipelineTemplate)

  await logAction(session, {
    action: 'JOB_UPDATED',
    entityType: 'Job',
    entityId: job._id,
    description: `Job ${job.jobCode} updated`,
    req,
  })

  const populated = await loadJob(tenantId, params.id)
  const related = await getJobRelatedData(tenantId, job._id)
  return ok({ ...populated.toObject(), ...related, remainingOpenings: computeRemainingOpenings(populated) }, 'Job opening updated')
})
