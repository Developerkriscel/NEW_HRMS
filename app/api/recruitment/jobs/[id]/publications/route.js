export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { JOB_VIEW_ROLES } from '@/lib/jobConstants'
import { canViewPublications } from '@/lib/publishingConstants'
import Job from '@/models/Job'
import JobPublication from '@/models/JobPublication'

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  if (!canViewPublications(session)) {
    return fail('You do not have permission to view publications', 403, 'FORBIDDEN')
  }

  const job = await Job.findOne({ _id: params.id, tenantId, deleted: false })
  if (!job) throw new ApiError(404, 'Job opening not found', 'NOT_FOUND')

  const publications = await JobPublication.find({ tenantId, jobId: job._id })
    .populate('publishedBy', 'firstName lastName')
    .sort({ createdAt: 1 })

  return ok(publications)
})
