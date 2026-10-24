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
    name: String(body.name || '').trim(),
    provider: String(body.provider || '').trim(),
    category: String(body.category || 'Software').trim(),
    billingCycle: body.billingCycle || 'MONTHLY',
    cost: body.cost === '' || body.cost == null ? 0 : Number(body.cost),
    currency: String(body.currency || 'INR').trim().toUpperCase(),
    seats: body.seats === '' || body.seats == null ? 1 : Number(body.seats),
    usedSeats: body.usedSeats === '' || body.usedSeats == null ? 0 : Number(body.usedSeats),
    startDate: toDateOrNull(body.startDate),
    renewalDate: toDateOrNull(body.renewalDate),
    autoRenew: body.autoRenew !== false,
    status: body.status || 'ACTIVE',
    ownerEmployee: body.ownerEmployee || null,
    url: String(body.url || '').trim(),
    notes: String(body.notes || '').trim(),
  }
}

function validatePayload(payload) {
  if (!payload.name || !payload.provider) return 'Subscription name and provider are required'
  if (!payload.startDate) return 'A valid start date is required'
  if (!Number.isFinite(payload.cost) || payload.cost < 0) return 'Cost must be a valid non-negative number'
  if (!Number.isInteger(payload.seats) || payload.seats < 1) return 'Seats must be at least 1'
  if (!Number.isInteger(payload.usedSeats) || payload.usedSeats < 0 || payload.usedSeats > payload.seats) return 'Used seats must be between 0 and total seats'
  if (payload.renewalDate && payload.renewalDate < payload.startDate) return 'Renewal date cannot be before the start date'
  return null
}

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const query = { tenantId, deleted: false }
  if (status) query.status = status
  const subscriptions = await AssetSubscription.find(query)
    .populate('ownerEmployee', 'firstName lastName employeeCode')
    .sort({ renewalDate: 1, createdAt: -1 })
    .lean()
  return ok(subscriptions)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const payload = cleanPayload(await req.json())
  const error = validatePayload(payload)
  if (error) return fail(error, 400, 'VALIDATION_ERROR')
  const subscription = await AssetSubscription.create({ ...payload, tenantId, createdBy: session.sub })
  return ok(await AssetSubscription.findById(subscription._id).populate('ownerEmployee', 'firstName lastName employeeCode'), 'Subscription created', 201)
})
