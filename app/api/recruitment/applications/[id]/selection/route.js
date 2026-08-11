export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { SELECTION_VIEW_ROLES } from '@/lib/selectionConstants'
import { populateApplication, computeScreeningResult } from '@/lib/candidateHelpers'
import { buildSelectionSummary } from '@/lib/selectionHelpers'
import Application from '@/models/Application'
import ApplicationAnswer from '@/models/ApplicationAnswer'
import SelectionDecision from '@/models/SelectionDecision'

// GET — the Selection Decision page's consolidated Hiring Summary: candidate
// profile, job match, assessment, interview rounds + panel feedback,
// screening, vacancy check, and the full decision history for this
// application. Deliberately does NOT include compensation — that lives
// behind its own, more tightly gated endpoint (item 14).
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, SELECTION_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const application = await populateApplication(Application.findOne({ _id: params.id, tenantId, deleted: false }))
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const [answers, summary, decisions] = await Promise.all([
    ApplicationAnswer.find({ tenantId, applicationId: application._id }).lean(),
    buildSelectionSummary(application, tenantId),
    SelectionDecision.find({ tenantId, applicationId: application._id }).sort({ decidedAt: -1 }).lean(),
  ])

  return ok({
    ...application.toObject(),
    screeningResult: computeScreeningResult(answers),
    ...summary,
    decisionHistory: decisions,
  })
})
