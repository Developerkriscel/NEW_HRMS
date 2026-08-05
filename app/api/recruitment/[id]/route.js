export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Candidate from '@/models/Candidate'

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const candidate = await Candidate.findOne({ _id: params.id, tenantId, deleted: false })
  if (!candidate) return fail('Candidate not found', 404)

  for (const field of ['name', 'email', 'phone', 'roleApplied', 'source', 'stage', 'resumeUrl', 'notes']) {
    if (body[field] !== undefined) candidate[field] = body[field]
  }
  candidate.updatedBy = session.sub
  await candidate.save()

  await logAction(session, {
    action: 'CANDIDATE_UPDATED',
    entityType: 'Candidate',
    entityId: candidate._id,
    description: `Candidate "${candidate.name}" updated`,
  })

  return ok(candidate, 'Candidate updated')
})
