export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { JOB_VIEW_ROLES, JOB_TRANSITIONS, canManageJobs, computeRemainingOpenings } from '@/lib/jobConstants'
import { populateJob, getActorName, getJobRelatedData } from '@/lib/jobHelpers'
import Job from '@/models/Job'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageJobs(session)) return fail('You do not have permission to pause job openings', 403, 'FORBIDDEN')

  const job = await populateJob(Job.findOne({ _id: params.id, tenantId, deleted: false }))
  if (!job) throw new ApiError(404, 'Job opening not found', 'NOT_FOUND')
  if (!JOB_TRANSITIONS.pause.from.includes(job.status)) {
    return fail('Only open job openings can be paused', 400, 'INVALID_STATUS')
  }

  const actorName = await getActorName(session)
  job.status = JOB_TRANSITIONS.pause.to
  job.updatedBy = session.sub
  job.activityLog.push({ type: 'PAUSED', message: `Paused by ${actorName}`, actorId: session.userId, actorName, comment: body.reason || null })
  await job.save()

  await logAction(session, { action: 'JOB_PAUSED', entityType: 'Job', entityId: job._id, description: `Job ${job.jobCode} paused`, req })

  const related = await getJobRelatedData(tenantId, job._id)
  return ok({ ...job.toObject(), ...related, remainingOpenings: computeRemainingOpenings(job) }, 'Job opening paused')
})
