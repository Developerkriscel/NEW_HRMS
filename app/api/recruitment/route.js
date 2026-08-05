export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Candidate from '@/models/Candidate'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const stage = new URL(req.url).searchParams.get('stage')
  const query = { tenantId, deleted: false }
  if (stage) query.stage = stage

  const candidates = await Candidate.find(query).sort({ createdAt: -1 })
  return ok(candidates)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!body.name || !body.email || !body.roleApplied) {
    return fail('name, email and roleApplied are required', 400)
  }

  const candidate = await Candidate.create({
    name: body.name,
    email: body.email,
    phone: body.phone,
    roleApplied: body.roleApplied,
    source: body.source,
    stage: body.stage || 'APPLIED',
    resumeUrl: body.resumeUrl,
    notes: body.notes,
    tenantId,
    createdBy: session.sub,
  })

  await logAction(session, {
    action: 'CANDIDATE_CREATED',
    entityType: 'Candidate',
    entityId: candidate._id,
    description: `Candidate "${candidate.name}" added`,
  })

  return ok(candidate, 'Candidate added', 201)
})
