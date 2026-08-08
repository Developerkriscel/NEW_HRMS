export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { JOB_VIEW_ROLES, JOB_ACTIVITY_TYPE } from '@/lib/jobConstants'
import { ACTIVE_PUBLICATION_STATUSES, PUBLISHING_CHANNEL_LABELS, canUnpublishJobs } from '@/lib/publishingConstants'
import { getConnector } from '@/lib/connectors'
import { getActorName } from '@/lib/requisitionHelpers'
import JobPublication from '@/models/JobPublication'
import Job from '@/models/Job'

// Removes the job from this one channel entirely — distinct from Pause.
// Never touches the internal Job status (spec is explicit: Job stays OPEN
// even if every channel gets unpublished individually).
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  if (!canUnpublishJobs(session)) return fail('You do not have permission to unpublish listings', 403, 'FORBIDDEN')

  const publication = await JobPublication.findOne({ _id: params.publicationId, jobId: params.id, tenantId, deleted: false })
  if (!publication) throw new ApiError(404, 'Publication not found', 'NOT_FOUND')
  if (!ACTIVE_PUBLICATION_STATUSES.includes(publication.status)) {
    return fail('This listing is not currently active', 400, 'INVALID_STATUS')
  }

  const connector = getConnector(publication.channel)
  const outcome = await connector.unpublish({ publication })
  publication.status = outcome.status
  publication.lastSyncedAt = new Date()
  await publication.save()

  const job = await Job.findOne({ _id: params.id, tenantId, deleted: false })
  if (job) {
    const actorName = await getActorName(session)
    job.activityLog.push({
      type: JOB_ACTIVITY_TYPE.UNPUBLISHED,
      message: `Unpublished from ${PUBLISHING_CHANNEL_LABELS[publication.channel]} by ${actorName}`,
      actorId: session.userId,
      actorName,
    })
    await job.save()
  }

  await logAction(session, {
    action: 'JOB_PUBLICATION_UNPUBLISHED',
    entityType: 'JobPublication',
    entityId: publication._id,
    description: `${PUBLISHING_CHANNEL_LABELS[publication.channel]} listing removed for job ${params.id}`,
    req,
  })

  return ok(publication, 'Listing unpublished')
})
