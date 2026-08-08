export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { JOB_VIEW_ROLES, JOB_ACTIVITY_TYPE } from '@/lib/jobConstants'
import { PUBLISHING_CHANNEL_LIST, PUBLISHING_CHANNEL_LABELS, PUBLICATION_STATUS, canPublishJobs } from '@/lib/publishingConstants'
import { validatePublishPreconditions } from '@/lib/publishingValidation'
import { publishJobToChannels } from '@/lib/publishingService'
import { getActorName } from '@/lib/requisitionHelpers'
import Job from '@/models/Job'
import Tenant from '@/models/Tenant'

// POST { channels: ['CAREER_PAGE', 'REFERRAL', ...] }
// Job-level preconditions (OPEN, public title/description, deadline) block
// the whole request; a disconnected external channel only fails that one
// channel — the response always lists a result per requested channel.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canPublishJobs(session)) {
    return fail('You do not have permission to publish job openings', 403, 'FORBIDDEN')
  }

  const channels = Array.isArray(body.channels) ? body.channels.filter(Boolean) : []
  if (!channels.length) return fail('Select at least one channel to publish to', 400, 'VALIDATION_ERROR')
  const invalidChannel = channels.find((c) => !PUBLISHING_CHANNEL_LIST.includes(c))
  if (invalidChannel) return fail(`Unknown channel "${invalidChannel}"`, 400, 'VALIDATION_ERROR')

  const job = await Job.findOne({ _id: params.id, tenantId, deleted: false })
  if (!job) throw new ApiError(404, 'Job opening not found', 'NOT_FOUND')

  const fieldErrors = validatePublishPreconditions(job)
  if (Object.keys(fieldErrors).length) {
    return fail('This job cannot be published yet', 400, 'VALIDATION_ERROR', { errors: fieldErrors })
  }

  // Tenant must match (session already scopes the DB connection, but the
  // connectors also need the actual Tenant doc to build career-page URLs).
  const tenant = await Tenant.findOne({ _id: tenantId, deleted: false }).lean()
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'NOT_FOUND')

  const results = await publishJobToChannels({ job, tenant, tenantId, channels, session })

  const actorName = await getActorName(session)
  const succeeded = results.filter((r) => r.status === PUBLICATION_STATUS.PUBLISHED).map((r) => PUBLISHING_CHANNEL_LABELS[r.channel])
  if (succeeded.length) {
    job.activityLog.push({
      type: JOB_ACTIVITY_TYPE.PUBLISHED,
      message: `Published to ${succeeded.join(', ')} by ${actorName}`,
      actorId: session.userId,
      actorName,
    })
    await job.save()
  }

  await logAction(session, {
    action: 'JOB_PUBLISHED',
    entityType: 'Job',
    entityId: job._id,
    description: `Job ${job.jobCode} publish requested for: ${channels.join(', ')}`,
    req,
  })

  return ok({ results }, 'Publish request processed')
})
