export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import Plan from '@/models/Plan'

const FIELDS = ['name', 'description', 'price', 'billingCycle', 'employeeLimit', 'storageLimitMb', 'apiQuota', 'integrationLimit', 'retentionTier', 'gracePeriodDays', 'features', 'trialDays', 'sortOrder', 'active']

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'plan.update')
  const body = await req.json()

  const plan = await Plan.findOne({ _id: params.id, deleted: false })
  if (!plan) return fail('Plan not found', 404)

  for (const field of FIELDS) {
    if (body[field] !== undefined) plan[field] = body[field]
  }
  plan.updatedBy = session.sub
  await plan.save()

  await logSuperAdmin(session, {
    action: 'PLAN_UPDATED',
    entityType: 'Plan',
    entityId: plan._id,
    description: `Plan ${plan.name} updated`,
    req,
  })

  return ok(plan, 'Plan updated')
})

export const DELETE = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'plan.archive')

  const plan = await Plan.findOne({ _id: params.id, deleted: false })
  if (!plan) return fail('Plan not found', 404)

  // Soft-disable only — matches the original, which never actually deletes
  // the plan document.
  plan.active = false
  plan.updatedBy = session.sub
  await plan.save()

  await logSuperAdmin(session, {
    action: 'PLAN_ARCHIVED',
    entityType: 'Plan',
    entityId: plan._id,
    description: `Plan ${plan.name} archived`,
    req,
  })

  return ok(null, 'Plan disabled')
})
