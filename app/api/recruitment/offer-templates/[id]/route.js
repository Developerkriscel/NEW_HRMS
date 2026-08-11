export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { OFFER_VIEW_ROLES, canManageOffers } from '@/lib/offerConstants'
import OfferTemplate from '@/models/OfferTemplate'

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const template = await OfferTemplate.findOne({ _id: params.id, tenantId, deleted: false })
  if (!template) throw new ApiError(404, 'Template not found', 'NOT_FOUND')
  return ok(template)
})

const EDITABLE_FIELDS = ['name', 'category', 'description', 'content', 'isActive']

export const PATCH = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageOffers(session)) return fail('You do not have permission to edit offer templates', 403, 'FORBIDDEN')

  const template = await OfferTemplate.findOne({ _id: params.id, tenantId, deleted: false })
  if (!template) throw new ApiError(404, 'Template not found', 'NOT_FOUND')

  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) template[field] = body[field]
  }
  await template.save()

  await logAction(session, { action: 'OFFER_TEMPLATE_UPDATED', entityType: 'OfferTemplate', entityId: template._id, description: `Offer template "${template.name}" updated`, req })

  return ok(template, 'Template updated')
})

export const DELETE = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, OFFER_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  if (!canManageOffers(session)) return fail('You do not have permission to delete offer templates', 403, 'FORBIDDEN')

  const template = await OfferTemplate.findOne({ _id: params.id, tenantId, deleted: false })
  if (!template) throw new ApiError(404, 'Template not found', 'NOT_FOUND')
  template.deleted = true
  await template.save()

  await logAction(session, { action: 'OFFER_TEMPLATE_DELETED', entityType: 'OfferTemplate', entityId: template._id, description: `Offer template "${template.name}" deleted`, req })

  return ok(null, 'Template deleted')
})
