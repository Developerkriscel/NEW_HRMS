export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import AssetSubscription from '@/models/AssetSubscription'

const MANAGE_ROLES = ['HR_MANAGER', 'COMPANY_ADMIN', 'IT_ADMIN', 'SUPER_ADMIN']

function toDateOrNull(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function cleanPayload(body) {
  return {
    name: String(body.name || '').trim(), provider: String(body.provider || '').trim(),
    category: String(body.category || 'Software').trim(), billingCycle: body.billingCycle || 'MONTHLY',
    cost: body.cost === '' || body.cost == null ? 0 : Number(body.cost), currency: String(body.currency || 'INR').trim().toUpperCase(),
    seats: body.seats === '' || body.seats == null ? 1 : Number(body.seats), usedSeats: body.usedSeats === '' || body.usedSeats == null ? 0 : Number(body.usedSeats),
    startDate: toDateOrNull(body.startDate), renewalDate: toDateOrNull(body.renewalDate), autoRenew: body.autoRenew !== false,
    status: body.status || 'ACTIVE', ownerEmployee: body.ownerEmployee || null, url: String(body.url || '').trim(), notes: String(body.notes || '').trim(),
  }
}

function validationError(payload) {
  if (!payload.name || !payload.provider || !payload.startDate) return 'Name, provider, and a valid start date are required'
  if (!Number.isFinite(payload.cost) || payload.cost < 0) return 'Cost must be a valid non-negative number'
  if (!Number.isInteger(payload.seats) || payload.seats < 1 || !Number.isInteger(payload.usedSeats) || payload.usedSeats < 0 || payload.usedSeats > payload.seats) return 'Seat values are invalid'
  if (payload.renewalDate && payload.renewalDate < payload.startDate) return 'Renewal date cannot be before the start date'
  return null
}

async function findOwned(id, tenantId) {
  return AssetSubscription.findOne({ _id: id, tenantId, deleted: false })
}

export const PATCH = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, MANAGE_ROLES)
  const payload = cleanPayload(await req.json())
  const error = validationError(payload)
  if (error) return fail(error, 400, 'VALIDATION_ERROR')
  const subscription = await findOwned(params.id, requireTenantId(session))
  if (!subscription) return fail('Subscription not found', 404, 'NOT_FOUND')
  Object.assign(subscription, payload, { updatedBy: session.sub })
  await subscription.save()
  return ok(await AssetSubscription.findById(subscription._id).populate('ownerEmployee', 'firstName lastName employeeCode'), 'Subscription updated')
})

export const DELETE = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, MANAGE_ROLES)
  const subscription = await findOwned(params.id, requireTenantId(session))
  if (!subscription) return fail('Subscription not found', 404, 'NOT_FOUND')
  subscription.deleted = true
  subscription.updatedBy = session.sub
  await subscription.save()
  return ok(null, 'Subscription deleted')
})
