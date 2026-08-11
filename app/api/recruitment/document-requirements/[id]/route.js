export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { PREBOARDING_VIEW_ROLES, canManagePreboarding } from '@/lib/preboardingConstants'
import DocumentRequirement from '@/models/DocumentRequirement'

const EDITABLE_FIELDS = ['name', 'category', 'employmentType', 'isRequired', 'allowedFileTypes', 'maxFileSize', 'requiresVerification', 'tracksExpiry', 'isActive']

export const PATCH = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManagePreboarding(session)) return fail('You do not have permission to edit document requirements', 403, 'FORBIDDEN')

  const requirement = await DocumentRequirement.findOne({ _id: params.id, tenantId, deleted: false })
  if (!requirement) throw new ApiError(404, 'Document requirement not found', 'NOT_FOUND')

  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) requirement[field] = body[field]
  }
  await requirement.save()

  await logAction(session, { action: 'DOCUMENT_REQUIREMENT_UPDATED', entityType: 'DocumentRequirement', entityId: requirement._id, description: `Document requirement "${requirement.name}" updated`, req })

  return ok(requirement, 'Document requirement updated')
})

export const DELETE = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  if (!canManagePreboarding(session)) return fail('You do not have permission to delete document requirements', 403, 'FORBIDDEN')

  const requirement = await DocumentRequirement.findOne({ _id: params.id, tenantId, deleted: false })
  if (!requirement) throw new ApiError(404, 'Document requirement not found', 'NOT_FOUND')
  requirement.deleted = true
  await requirement.save()

  await logAction(session, { action: 'DOCUMENT_REQUIREMENT_DELETED', entityType: 'DocumentRequirement', entityId: requirement._id, description: `Document requirement "${requirement.name}" deleted`, req })

  return ok(null, 'Document requirement deleted')
})
