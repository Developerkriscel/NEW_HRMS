export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { CANDIDATE_MANAGE_ROLES } from '@/lib/candidateConstants'
import CandidateTagAssignment from '@/models/CandidateTagAssignment'

export const DELETE = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)

  await CandidateTagAssignment.deleteOne({ tenantId, candidateId: params.id, tagId: params.tagId })
  return ok(null, 'Tag removed')
})
