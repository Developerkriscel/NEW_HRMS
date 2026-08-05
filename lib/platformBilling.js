import Subscription from '@/models/Subscription'
import SubscriptionHistory from '@/models/SubscriptionHistory'
import Plan from '@/models/Plan'
import Employee from '@/models/Employee'
import TenantUsage from '@/models/TenantUsage'
import { runForTenant } from '@/lib/tenantDb'
import { applyLifecycleTransition } from '@/lib/platformTenancy'
import { ApiError } from '@/lib/auth'

export async function recordSubscriptionHistory({ subscription, tenant, changeType, fromValue, toValue, reason, operator }) {
  return SubscriptionHistory.create({
    subscription: subscription._id,
    tenant: tenant._id,
    changeType,
    fromValue: fromValue != null ? String(fromValue) : null,
    toValue: toValue != null ? String(toValue) : null,
    reason,
    performedBy: operator.userId,
    performedByEmail: operator.sub,
  })
}

// Changing plans never deletes the old assignment — it's just overwritten
// on the Subscription/Tenant docs, with the full before/after captured in
// SubscriptionHistory. Modules the tenant currently has enabled that the
// new plan doesn't allow at all get turned off (not silently left enabled
// against a plan that no longer grants them) and that's noted in the entry.
export async function changeSubscriptionPlan({ subscription, tenant, newPlanId, reason, operator }) {
  const newPlan = await Plan.findOne({ _id: newPlanId, deleted: false })
  if (!newPlan) throw new ApiError(404, 'Target plan not found', 'PLAN_NOT_FOUND')
  if (!newPlan.active) throw new ApiError(400, 'Cannot move a tenant onto an archived plan', 'PLAN_ARCHIVED')

  const oldPlanId = subscription.plan
  subscription.plan = newPlan._id
  await subscription.save()

  tenant.plan = newPlan._id
  tenant.updatedBy = operator.sub
  await tenant.save()

  await recordSubscriptionHistory({
    subscription, tenant, changeType: 'PLAN_CHANGED',
    fromValue: String(oldPlanId), toValue: String(newPlan._id), reason, operator,
  })

  return { subscription, tenant, newPlan }
}

export async function extendTrial({ subscription, tenant, newTrialEndDate, reason, operator }) {
  const newDate = new Date(newTrialEndDate)
  if (Number.isNaN(newDate.getTime()) || newDate <= new Date()) {
    throw new ApiError(400, 'Trial extension date must be in the future', 'INVALID_DATE')
  }
  if (subscription.trialEndDate && newDate <= subscription.trialEndDate) {
    throw new ApiError(400, 'Trial extension date must be after the current trial end date', 'INVALID_DATE')
  }

  const oldDate = subscription.trialEndDate
  subscription.trialEndDate = newDate
  await subscription.save()

  await recordSubscriptionHistory({
    subscription, tenant, changeType: 'TRIAL_EXTENDED',
    fromValue: oldDate?.toISOString() || null, toValue: newDate.toISOString(), reason, operator,
  })

  return subscription
}

const GRACE_TENANT_TRANSITIONS_IN = new Set(['TRIAL', 'ACTIVE'])

export async function manageGracePeriod({ subscription, tenant, action, reason, operator, graceDays }) {
  if (action === 'ENTER') {
    if (subscription.status === 'GRACE') throw new ApiError(400, 'Subscription is already in grace period', 'ALREADY_GRACE')
    const plan = subscription.plan ? await Plan.findById(subscription.plan) : null
    const days = graceDays || plan?.gracePeriodDays || 7
    const endsAt = new Date(Date.now() + days * 86400000)

    const fromStatus = subscription.status
    subscription.status = 'GRACE'
    subscription.graceEndsAt = endsAt
    await subscription.save()

    if (GRACE_TENANT_TRANSITIONS_IN.has(tenant.status)) {
      await applyLifecycleTransition({ tenant, toStatus: 'GRACE', reason, operator })
    }

    await recordSubscriptionHistory({ subscription, tenant, changeType: 'GRACE_STARTED', fromValue: fromStatus, toValue: 'GRACE', reason, operator })
    return subscription
  }

  if (action === 'EXIT') {
    if (subscription.status !== 'GRACE') throw new ApiError(400, 'Subscription is not in grace period', 'NOT_IN_GRACE')
    subscription.status = 'ACTIVE'
    subscription.graceEndsAt = null
    await subscription.save()

    if (tenant.status === 'GRACE') {
      await applyLifecycleTransition({ tenant, toStatus: 'ACTIVE', reason, operator })
    }

    await recordSubscriptionHistory({ subscription, tenant, changeType: 'GRACE_ENDED', fromValue: 'GRACE', toValue: 'ACTIVE', reason, operator })
    return subscription
  }

  throw new ApiError(400, 'action must be ENTER or EXIT', 'INVALID_ACTION')
}

export async function changeSubscriptionStatus({ subscription, tenant, toStatus, reason, operator }) {
  const allowed = ['TRIAL', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED']
  if (!allowed.includes(toStatus)) throw new ApiError(400, 'Invalid subscription status', 'INVALID_STATUS')

  const fromStatus = subscription.status
  subscription.status = toStatus
  await subscription.save()

  await recordSubscriptionHistory({ subscription, tenant, changeType: 'STATUS_CHANGED', fromValue: fromStatus, toValue: toStatus, reason, operator })
  return subscription
}

export async function computeUsageSnapshot(tenant) {
  const employeeCount = await runForTenant(tenant, () => Employee.countDocuments({ tenantId: tenant._id, deleted: false }))

  const snapshot = await TenantUsage.create({
    tenant: tenant._id,
    employeeCount,
    employeeLimit: tenant.employeeLimit,
    storageUsedMb: tenant.storageUsedMb,
    storageLimitMb: tenant.storageLimitMb,
    apiCallsThisMonth: 0, // no request-metering instrumentation exists yet — honestly zero, not estimated
    apiQuota: tenant.apiQuota,
    integrationCount: 0, // no integration system exists yet
    integrationLimit: tenant.integrationLimit,
  })

  return snapshot
}
