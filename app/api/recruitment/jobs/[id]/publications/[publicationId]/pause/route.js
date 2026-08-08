export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { JOB_VIEW_ROLES } from '@/lib/jobConstants'
import { PUBLICATION_STATUS, PUBLISHING_CHANNEL_LABELS, canUnpublishJobs } from '@/lib/publishingConstants'
import { getConnector } from '@/lib/connectors'
import JobPublication from '@/models/JobPublication'

// Temporarily stops new applications on this one channel — the job itself,
// and every other channel's publication, are untouched.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  if (!canUnpublishJobs(session)) return fail('You do not have permission to pause publications', 403, 'FORBIDDEN')

  const publication = await JobPublication.findOne({ _id: params.publicationId, jobId: params.id, tenantId, deleted: false })
  if (!publication) throw new ApiError(404, 'Publication not found', 'NOT_FOUND')
  if (publication.status !== PUBLICATION_STATUS.PUBLISHED) {
    return fail('Only a published listing can be paused', 400, 'INVALID_STATUS')
  }

  const connector = getConnector(publication.channel)
  const outcome = await connector.pause({ publication })
  publication.status = outcome.status
  publication.lastSyncedAt = new Date()
  await publication.save()

  await logAction(session, {
    action: 'JOB_PUBLICATION_PAUSED',
    entityType: 'JobPublication',
    entityId: publication._id,
    description: `${PUBLISHING_CHANNEL_LABELS[publication.channel]} listing paused for job ${params.id}`,
    req,
  })

  return ok(publication, 'Listing paused')
})
