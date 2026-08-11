export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { CANDIDATE_VIEW_ROLES, CANDIDATE_MANAGE_ROLES } from '@/lib/candidateConstants'
import CandidateTag from '@/models/CandidateTag'

// GET — the tenant's reusable tag vocabulary (item 15).
export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const tags = await CandidateTag.find({ tenantId, deleted: false }).sort({ name: 1 })
  return ok(tags)
})

// POST { name } — create a new tag if it doesn't already exist (case
// insensitive), otherwise return the existing one. Used both by the
// standalone "manage tags" flow and by the tag picker's "create new" option.
export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const name = body.name?.trim()
  if (!name) return fail('Tag name is required', 400, 'VALIDATION_ERROR')

  const tag = await CandidateTag.findOneAndUpdate(
    { tenantId, name: { $regex: `^${name}$`, $options: 'i' } },
    { $setOnInsert: { tenantId, name, createdBy: session.sub } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  return ok(tag, 'Tag ready', 201)
})
