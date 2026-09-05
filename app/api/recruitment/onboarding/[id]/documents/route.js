export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { PREBOARDING_VIEW_ROLES, canManagePreboarding } from '@/lib/preboardingConstants'
import { recomputePreboardingStatus } from '@/lib/preboardingHelpers'
import Preboarding from '@/models/Preboarding'
import DocumentRequirement from '@/models/DocumentRequirement'
import CandidateDocument from '@/models/CandidateDocument'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  if (!canManagePreboarding(session)) return fail('You do not have permission to add onboarding documents', 403, 'FORBIDDEN')

  const body = await req.json()
  if (!body.name?.trim()) return fail('Document name is required', 400, 'VALIDATION_ERROR')

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')

  const requirement = await DocumentRequirement.create({
    tenantId,
    name: body.name.trim(),
    category: body.category || 'Other',
    employmentType: null,
    isRequired: body.required !== false,
    requiresVerification: body.requiresVerification !== false,
    tracksExpiry: !!body.tracksExpiry,
    isActive: true,
    order: Date.now(),
  })

  const doc = await CandidateDocument.create({
    tenantId,
    preboardingId: preboarding._id,
    candidateId: preboarding.candidateId,
    requirementId: requirement._id,
    name: requirement.name,
    category: requirement.category,
    isRequired: requirement.isRequired,
    requiresVerification: requirement.requiresVerification,
    tracksExpiry: requirement.tracksExpiry,
  })

  preboarding.activityLog.push({
    type: 'DOCUMENT_REQUESTED',
    message: `Document requested: ${doc.name}`,
    actorName: session.name || session.sub,
  })
  await recomputePreboardingStatus(tenantId, preboarding)
  await preboarding.save()

  return ok(doc, 'Document requested', 201)
})
