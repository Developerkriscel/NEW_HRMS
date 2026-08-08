export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { JOB_VIEW_ROLES } from '@/lib/jobConstants'
import { PUBLICATION_STATUS, canPublishJobs } from '@/lib/publishingConstants'
import { validatePublishPreconditions } from '@/lib/publishingValidation'
import { publishJobToChannels } from '@/lib/publishingService'
import JobPublication from '@/models/JobPublication'
import Job from '@/models/Job'
import Tenant from '@/models/Tenant'

// Re-attempts a single failed channel — e.g. after HR connects LinkedIn,
// retry the one publication that failed with NOT_CONNECTED instead of
// re-selecting every channel again.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  if (!canPublishJobs(session)) return fail('You do not have permission to publish job openings', 403, 'FORBIDDEN')

  const publication = await JobPublication.findOne({ _id: params.publicationId, jobId: params.id, tenantId, deleted: false })
  if (!publication) throw new ApiError(404, 'Publication not found', 'NOT_FOUND')
  if (publication.status !== PUBLICATION_STATUS.FAILED) {
    return fail('Only a failed publication can be retried', 400, 'INVALID_STATUS')
  }

  const job = await Job.findOne({ _id: params.id, tenantId, deleted: false })
  if (!job) throw new ApiError(404, 'Job opening not found', 'NOT_FOUND')

  const fieldErrors = validatePublishPreconditions(job)
  if (Object.keys(fieldErrors).length) {
    return fail('This job cannot be published yet', 400, 'VALIDATION_ERROR', { errors: fieldErrors })
  }

  const tenant = await Tenant.findOne({ _id: tenantId, deleted: false }).lean()
  if (!tenant) throw new ApiError(404, 'Tenant not found', 'NOT_FOUND')

  const [result] = await publishJobToChannels({ job, tenant, tenantId, channels: [publication.channel], session })

  await logAction(session, {
    action: 'JOB_PUBLICATION_RETRIED',
    entityType: 'JobPublication',
    entityId: publication._id,
    description: `Retried ${publication.channel} for job ${job.jobCode} — result: ${result.status}`,
    req,
  })

  return ok(result, result.status === PUBLICATION_STATUS.PUBLISHED ? 'Retry succeeded' : 'Retry did not succeed')
})
