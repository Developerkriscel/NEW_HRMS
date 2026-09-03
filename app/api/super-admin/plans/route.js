export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import Plan from '@/models/Plan'
import { devSuperAdminStore } from '@/lib/devSuperAdminStore'

let cachedPlans = null
let plansCachedAt = 0
const PLANS_CACHE_TTL = 60000 // 60s cache

export const GET = withApi(async () => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'plan.view')
  if (session.devLogin && process.env.NODE_ENV !== 'production') return ok(devSuperAdminStore.listPlans())
  
  if (cachedPlans && Date.now() - plansCachedAt < PLANS_CACHE_TTL) {
    return ok(cachedPlans)
  }

  const plans = await Plan.find({ deleted: false }).sort({ sortOrder: 1 }).lean()
  cachedPlans = plans
  plansCachedAt = Date.now()
  return ok(plans)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'plan.create')
  const body = await req.json()
  if (session.devLogin && process.env.NODE_ENV !== 'production') {
    const plan = devSuperAdminStore.createPlan(body)
    if (plan.error) return fail(plan.error, 400, 'DUPLICATE')
    return ok(plan, 'Plan created', 201)
  }

  const existing = await Plan.findOne({ name: body.name, deleted: false })
  if (existing) return fail('A plan with this name already exists', 400, 'DUPLICATE')

  const plan = await Plan.create({
    name: body.name,
    description: body.description,
    price: body.price,
    billingCycle: body.billingCycle,
    employeeLimit: body.employeeLimit,
    storageLimitMb: body.storageLimitMb,
    apiQuota: body.apiQuota,
    integrationLimit: body.integrationLimit,
    retentionTier: body.retentionTier,
    gracePeriodDays: body.gracePeriodDays,
    features: body.features,
    trialDays: body.trialDays,
    sortOrder: body.sortOrder,
    createdBy: session.sub,
  })

  await logSuperAdmin(session, {
    action: 'PLAN_CREATED',
    entityType: 'Plan',
    entityId: plan._id,
    description: `Plan ${plan.name} created`,
    req,
  })

  cachedPlans = null
  return ok(plan, 'Plan created', 201)
})
