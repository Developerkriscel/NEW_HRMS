export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { PREBOARDING_VIEW_ROLES, canManagePreboarding, FORM_STATUS, PREBOARDING_FORM_SECTIONS } from '@/lib/preboardingConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Preboarding from '@/models/Preboarding'

const SECTION_KEYS = PREBOARDING_FORM_SECTIONS.map((s) => s.key)

// POST { fields: [sectionKey...], comment } — HR picks specific *sections*
// ("☑ Bank Account  ☐ Address  ☐ Education") plus a mandatory comment.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManagePreboarding(session)) return fail('You do not have permission to request a correction', 403, 'FORBIDDEN')
  const fields = Array.isArray(body.fields) ? body.fields.filter((f) => SECTION_KEYS.includes(f)) : []
  if (!fields.length) return fail('Select at least one section that needs correction', 400, 'VALIDATION_ERROR')
  if (!body.comment?.trim()) return fail('A comment is required', 400, 'VALIDATION_ERROR')

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')
  if (preboarding.formStatus !== FORM_STATUS.SUBMITTED) {
    return fail('A correction can only be requested on a submitted form', 400, 'INVALID_STATE')
  }

  const actorName = await getActorName(session)
  preboarding.formStatus = FORM_STATUS.CORRECTION_REQUIRED
  preboarding.correctionRequest = { fields, comment: body.comment.trim(), requestedBy: session.userId, requestedByName: actorName, requestedAt: new Date() }
  preboarding.activityLog.push({
    type: 'STATUS_CHANGED',
    message: `Correction requested by ${actorName} — ${fields.map((f) => PREBOARDING_FORM_SECTIONS.find((s) => s.key === f)?.label || f).join(', ')}`,
    comment: body.comment.trim(), actorName,
  })
  await preboarding.save()

  await logAction(session, { action: 'PREBOARDING_CORRECTION_REQUESTED', entityType: 'Preboarding', entityId: preboarding._id, description: `Correction requested: ${fields.join(', ')}`, req })

  return ok(preboarding, 'Correction requested')
})
