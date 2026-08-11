export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { PREBOARDING_VIEW_ROLES, canManagePreboarding, DOCUMENT_REQUIREMENT_CATEGORIES } from '@/lib/preboardingConstants'
import { ensureDefaultDocumentRequirements } from '@/lib/preboardingHelpers'
import DocumentRequirement from '@/models/DocumentRequirement'

// GET — auto-seeds the Full-Time/Intern starter checklist on first access.
export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  await ensureDefaultDocumentRequirements(tenantId)
  const requirements = await DocumentRequirement.find({ tenantId, deleted: false }).sort({ employmentType: 1, order: 1 })
  return ok(requirements)
})

// POST { name, category, employmentType?, isRequired?, allowedFileTypes?,
//        maxFileSize?, requiresVerification?, tracksExpiry? } — item 2:
// "requirements may vary by employment type... don't hard-code one list."
export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManagePreboarding(session)) return fail('You do not have permission to configure document requirements', 403, 'FORBIDDEN')
  if (!body.name?.trim()) return fail('A document name is required', 400, 'VALIDATION_ERROR')
  if (body.category && !DOCUMENT_REQUIREMENT_CATEGORIES.includes(body.category)) return fail('Invalid category', 400, 'VALIDATION_ERROR')

  const requirement = await DocumentRequirement.create({
    tenantId, name: body.name.trim(), category: body.category || 'Other', employmentType: body.employmentType || null,
    isRequired: body.isRequired !== false, allowedFileTypes: body.allowedFileTypes, maxFileSize: body.maxFileSize,
    requiresVerification: body.requiresVerification !== false, tracksExpiry: !!body.tracksExpiry,
  })

  await logAction(session, { action: 'DOCUMENT_REQUIREMENT_CREATED', entityType: 'DocumentRequirement', entityId: requirement._id, description: `Document requirement "${requirement.name}" created`, req })

  return ok(requirement, 'Document requirement created', 201)
})
