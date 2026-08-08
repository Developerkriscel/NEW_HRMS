export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { CANDIDATE_VIEW_ROLES, canManageCandidates, ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Candidate from '@/models/Candidate'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageCandidates(session)) return fail('You do not have permission to add notes', 403, 'FORBIDDEN')
  if (!body.note?.trim()) return fail('Note text is required', 400, 'VALIDATION_ERROR')

  const candidate = await Candidate.findOne({ _id: params.id, tenantId, deleted: false })
  if (!candidate) throw new ApiError(404, 'Candidate not found', 'NOT_FOUND')

  const actorName = await getActorName(session)
  candidate.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.NOTE, message: body.note.trim(), actorId: session.userId, actorName })
  await candidate.save()

  return ok(candidate, 'Note added')
})
