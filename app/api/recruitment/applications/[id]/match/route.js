export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_VIEW_ROLES, CANDIDATE_MANAGE_ROLES } from '@/lib/candidateConstants'
import { generateMatchForApplication } from '@/lib/matchHelpers'
import Application from '@/models/Application'
import CandidateJobMatch from '@/models/CandidateJobMatch'

// GET — retrieve the latest match result (no recompute).
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false }).select('_id')
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const match = await CandidateJobMatch.findOne({ tenantId, applicationId: application._id })
  return ok(match)
})

// POST — generate a match if none exists yet (or refresh it — same
// deterministic computation either way, see lib/matchHelpers.js).
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false }).select('_id')
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const match = await generateMatchForApplication(params.id, tenantId, { actorName: session.sub })
  if (!match) return ok(null, 'Could not generate a match — candidate or job data is missing')

  await logAction(session, { action: 'MATCH_GENERATED', entityType: 'Application', entityId: application._id, description: `AI match generated: ${match.overallScore}%`, req })

  return ok(match, 'Match generated', 201)
})
