export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import { withOptionalMongoTransaction } from '@/lib/mongoTransaction'
import Plan from '@/models/Plan'

const BILLING_CYCLES = new Set(['MONTHLY', 'YEARLY'])

function validatePlan(input, index) {
  const plan = input && typeof input === 'object' ? input : {}
  const name = String(plan.name || '').trim()
  if (name.length < 2 || name.length > 80) return `Plan ${index + 1}: name must be 2-80 characters`
  if (!BILLING_CYCLES.has(plan.billingCycle)) return `Plan ${index + 1}: billing cycle is invalid`

  const numericFields = [
    ['price', 0],
    ['employeeLimit', -1],
    ['storageLimitMb', 0],
    ['apiQuota', -1],
    ['integrationLimit', -1],
    ['gracePeriodDays', 0],
    ['trialDays', 0],
  ]
  for (const [field, minimum] of numericFields) {
    const value = Number(plan[field])
    if (!Number.isInteger(value) || value < minimum) return `Plan ${index + 1}: ${field} must be a valid integer`
  }
  if (!Array.isArray(plan.features) || plan.features.length === 0) return `Plan ${index + 1}: at least one feature is required`
  return null
}

function toDocument(plan, session) {
  return {
    name: String(plan.name).trim(),
    description: String(plan.description || '').trim(),
    price: Number(plan.price),
    billingCycle: plan.billingCycle,
    employeeLimit: Number(plan.employeeLimit),
    storageLimitMb: Number(plan.storageLimitMb),
    apiQuota: Number(plan.apiQuota),
    integrationLimit: Number(plan.integrationLimit),
    gracePeriodDays: Number(plan.gracePeriodDays),
    trialDays: Number(plan.trialDays),
    features: plan.features.map((feature) => String(feature).trim()).filter(Boolean),
    active: true,
    deleted: false,
    sortOrder: Number(plan.sortOrder || 0),
    createdBy: session.sub,
  }
}

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'plan.create')
  const body = await req.json().catch(() => ({}))
  const plans = Array.isArray(body.plans) ? body.plans : []

  if (plans.length !== 4) return fail('Exactly four plans are required', 400, 'VALIDATION_ERROR')

  const errors = plans.map(validatePlan).filter(Boolean)
  if (errors.length) return fail(errors[0], 400, 'VALIDATION_ERROR')

  const normalizedNames = plans.map((plan) => String(plan.name).trim().toLowerCase())
  if (new Set(normalizedNames).size !== normalizedNames.length) {
    return fail('Plan names must be unique', 400, 'DUPLICATE')
  }

  const existing = await Plan.find({
    deleted: false,
    $or: plans.map((plan) => ({ name: { $regex: `^${String(plan.name).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } })),
  }).select('name').lean()
  if (existing.length) return fail(`These plans already exist: ${existing.map((plan) => plan.name).join(', ')}`, 409, 'DUPLICATE')

  const created = await withOptionalMongoTransaction(async (dbSession) => {
    const documents = plans.map((plan) => toDocument(plan, session))
    return Plan.insertMany(documents, dbSession ? { session: dbSession } : undefined)
  })

  await logSuperAdmin(session, {
    action: 'PLANS_BULK_CREATED',
    entityType: 'Plan',
    entityId: created[0]?._id,
    description: `Created ${created.length} subscription plans`,
    req,
  })

  return ok(created, 'Four plans created', 201)
})
