export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { CANDIDATE_VIEW_ROLES } from '@/lib/candidateConstants'
import { computeRemainingOpenings } from '@/lib/jobConstants'
import Job from '@/models/Job'

// Minimal job picker for the pipeline board. This stays under the Pipeline
// module so an HR Manager with only Pipeline authority can still choose a job
// without needing full Open Positions access.
export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const jobs = await Job.find({ tenantId, deleted: false })
    .select('jobCode jobTitle publicTitle status totalOpenings filledOpenings createdAt')
    .sort({ createdAt: -1 })
    .lean()

  return ok({
    content: jobs.map((job) => ({
      ...job,
      remainingOpenings: computeRemainingOpenings(job),
    })),
  })
})
