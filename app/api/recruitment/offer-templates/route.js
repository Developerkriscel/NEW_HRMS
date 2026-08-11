export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { OFFER_VIEW_ROLES, canManageOffers } from '@/lib/offerConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { getActiveTemplates } from '@/lib/offerHelpers'
import OfferTemplate from '@/models/OfferTemplate'

// GET — auto-seeds the 5 starter templates on first access (item 5).
export const GET = withApi(async () => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const templates = await getActiveTemplates(tenantId)
  return ok(templates)
})

// POST { name, category?, description?, content } — HR maintains its own
// reusable templates (item 5).
export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageOffers(session)) return fail('You do not have permission to create offer templates', 403, 'FORBIDDEN')
  if (!body.name?.trim()) return fail('A template name is required', 400, 'VALIDATION_ERROR')
  if (!body.content?.trim()) return fail('Template content is required', 400, 'VALIDATION_ERROR')

  const actorName = await getActorName(session)
  const template = await OfferTemplate.create({
    tenantId, name: body.name.trim(), category: body.category || null, description: body.description || null,
    content: body.content, createdBy: session.userId, createdByName: actorName,
  })

  await logAction(session, { action: 'OFFER_TEMPLATE_CREATED', entityType: 'OfferTemplate', entityId: template._id, description: `Offer template "${template.name}" created`, req })

  return ok(template, 'Template created', 201)
})
