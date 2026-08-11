export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { CANDIDATE_VIEW_ROLES } from '@/lib/candidateConstants'
import Application from '@/models/Application'
import ApplicationStageHistory from '@/models/ApplicationStageHistory'

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false }).select('_id')
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const history = await ApplicationStageHistory.find({ tenantId, applicationId: application._id }).sort({ createdAt: 1 })
  return ok(history)
})
