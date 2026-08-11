export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_MANAGE_ROLES } from '@/lib/candidateConstants'
import { generateMatchForApplication } from '@/lib/matchHelpers'
import Application from '@/models/Application'

// POST — the explicit "[Recalculate Match]" button: job requirements or
// the candidate's resume/profile may have changed since the match was last
// generated (jobVersion/resumeVersion on the stored row is how you'd
// notice that — this always recomputes regardless).
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false }).select('_id')
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const match = await generateMatchForApplication(params.id, tenantId, { actorName: session.sub })
  if (!match) return ok(null, 'Could not recalculate — candidate or job data is missing')

  await logAction(session, { action: 'MATCH_RECALCULATED', entityType: 'Application', entityId: application._id, description: `AI match recalculated: ${match.overallScore}%`, req })

  return ok(match, 'Match recalculated')
})
