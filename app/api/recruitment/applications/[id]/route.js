export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { CANDIDATE_VIEW_ROLES } from '@/lib/candidateConstants'
import { populateApplication, computeScreeningResult } from '@/lib/candidateHelpers'
import { syncPipelineStages } from '@/lib/jobHelpers'
import Application from '@/models/Application'
import ApplicationAnswer from '@/models/ApplicationAnswer'
import JobPipelineStage from '@/models/JobPipelineStage'

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const application = await populateApplication(Application.findOne({ _id: params.id, tenantId, deleted: false }))
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const [answers, existingStages] = await Promise.all([
    ApplicationAnswer.find({ tenantId, applicationId: application._id }).lean(),
    JobPipelineStage.find({ tenantId, jobId: application.jobId._id, isActive: true }).sort({ order: 1 }).lean(),
  ])
  let stages = existingStages
  if (!stages.length) {
    await syncPipelineStages(tenantId, application.jobId._id, null, application.jobId.pipelineTemplate || 'DEFAULT_HIRING')
    stages = await JobPipelineStage.find({ tenantId, jobId: application.jobId._id, isActive: true }).sort({ order: 1 }).lean()
  }

  return ok({
    ...application.toObject(),
    answers,
    screeningResult: computeScreeningResult(answers),
    pipelineStages: stages,
  })
})
