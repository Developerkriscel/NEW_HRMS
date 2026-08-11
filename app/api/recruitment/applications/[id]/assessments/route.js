export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { ASSESSMENT_VIEW_ROLES } from '@/lib/assessmentConstants'
import { enforceExpiry } from '@/lib/assessmentHelpers'
import CandidateAssessment from '@/models/CandidateAssessment'
import AssessmentTemplate from '@/models/AssessmentTemplate'

// GET — every assessment ever assigned to this application, newest first,
// for the Application Detail page's Assessments section.
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ASSESSMENT_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const list = await CandidateAssessment.find({ tenantId, applicationId: params.id, deleted: false }).sort({ assignedAt: -1 })
  let changed = false
  for (const ca of list) { if (enforceExpiry(ca)) { await ca.save(); changed = true } }

  const assessmentIds = list.map((ca) => ca.assessmentId)
  const assessments = await AssessmentTemplate.find({ tenantId, _id: { $in: assessmentIds } }).select('name type passingScore').lean()
  const assessmentById = new Map(assessments.map((a) => [String(a._id), a]))

  return ok(list.map((ca) => ({ ...ca.toObject(), assessment: assessmentById.get(String(ca.assessmentId)) })))
})
