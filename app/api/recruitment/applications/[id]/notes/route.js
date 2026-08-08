export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { CANDIDATE_VIEW_ROLES, canManageCandidates, ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Application from '@/models/Application'

// Recruiter Notes on the Application Detail page — stored as an activity
// entry (type NOTE) rather than a separate collection, same pattern as
// every other embedded activityLog in this codebase.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageCandidates(session)) return fail('You do not have permission to add notes', 403, 'FORBIDDEN')
  if (!body.note?.trim()) return fail('Note text is required', 400, 'VALIDATION_ERROR')

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const actorName = await getActorName(session)
  application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.NOTE, message: body.note.trim(), actorId: session.userId, actorName })
  await application.save()

  return ok(application, 'Note added')
})
