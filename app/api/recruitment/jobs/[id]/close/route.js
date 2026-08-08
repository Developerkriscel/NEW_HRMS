export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { JOB_VIEW_ROLES, JOB_TRANSITIONS, canManageJobs, computeRemainingOpenings } from '@/lib/jobConstants'
import { populateJob, getActorName, getJobRelatedData } from '@/lib/jobHelpers'
import { ACTIVE_PUBLICATION_STATUSES } from '@/lib/publishingConstants'
import { unpublishAllActive } from '@/lib/publishingService'
import Job from '@/models/Job'

// Hiring stopped manually — distinct from CANCELLED (requirement no longer
// exists) and FILLED (all positions successfully hired).
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageJobs(session)) return fail('You do not have permission to close job openings', 403, 'FORBIDDEN')

  const job = await populateJob(Job.findOne({ _id: params.id, tenantId, deleted: false }))
  if (!job) throw new ApiError(404, 'Job opening not found', 'NOT_FOUND')
  if (!JOB_TRANSITIONS.close.from.includes(job.status)) {
    return fail('Only open or paused job openings can be closed', 400, 'INVALID_STATUS')
  }

  const actorName = await getActorName(session)
  job.status = JOB_TRANSITIONS.close.to
  job.updatedBy = session.sub
  job.activityLog.push({ type: 'CLOSED', message: `Closed by ${actorName}`, actorId: session.userId, actorName, comment: body.reason || null })
  await job.save()

  await logAction(session, { action: 'JOB_CLOSED', entityType: 'Job', entityId: job._id, description: `Job ${job.jobCode} closed`, req })

  // Never implicit — only unpublishes every active channel if HR explicitly
  // opted in ("Close Job + Unpublish"), matching the spec's own example
  // that Job=CLOSED with Career Page still PUBLISHED is a valid state.
  let unpublished = null
  if (body.unpublishAll) {
    const { results } = await unpublishAllActive({ jobId: job._id, tenantId, session, activeStatuses: ACTIVE_PUBLICATION_STATUSES })
    unpublished = results
    if (results.length) {
      await logAction(session, { action: 'JOB_PUBLICATIONS_BULK_UNPUBLISHED', entityType: 'Job', entityId: job._id, description: `Unpublished ${results.length} channel(s) for job ${job.jobCode} on close`, req })
    }
  }

  const related = await getJobRelatedData(tenantId, job._id)
  return ok({ ...job.toObject(), ...related, remainingOpenings: computeRemainingOpenings(job), unpublished }, 'Job opening closed')
})
