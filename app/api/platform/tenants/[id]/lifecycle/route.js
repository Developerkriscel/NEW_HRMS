export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import { applyLifecycleTransition, getRequiredPermissionForTransition, TENANT_STATUSES } from '@/lib/platformTenancy'
import Tenant from '@/models/Tenant'
import TenantLifecycleEvent from '@/models/TenantLifecycleEvent'
import PlatformComplianceRequest from '@/models/PlatformComplianceRequest'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.view')

  const events = await TenantLifecycleEvent.find({ tenant: params.id }).sort({ createdAt: -1 }).limit(100)
  return ok(events)
})

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()

  const body = await req.json().catch(() => ({}))
  const { toStatus, reason, purgeScheduledFor } = body

  if (!TENANT_STATUSES.includes(toStatus)) return fail('Invalid target status', 400)
  if (!reason || !reason.trim()) return fail('A reason is required for tenant status changes', 400, 'REASON_REQUIRED')

  const tenant = await Tenant.findOne({ _id: params.id, deleted: false })
  if (!tenant) return fail('Tenant not found', 404)

  const requiredPermission = getRequiredPermissionForTransition(tenant.status, toStatus)
  if (!requiredPermission) return fail('This status transition is not supported', 400, 'INVALID_TRANSITION')
  requirePlatformPermission(session, requiredPermission)

  if (toStatus === 'PURGE_SCHEDULED') {
    const activeHold = await PlatformComplianceRequest.findOne({
      tenant: tenant._id,
      type: 'RETENTION_HOLD',
      status: { $in: ['OPEN', 'ON_HOLD', 'APPROVED'] },
      $or: [{ retentionHoldUntil: null }, { retentionHoldUntil: { $gt: new Date() } }],
      deleted: false,
    })
    if (activeHold) return fail('Tenant has an active retention hold', 409, 'RETENTION_HOLD_ACTIVE')
  }

  const fromStatus = tenant.status
  const updated = await applyLifecycleTransition({ tenant, toStatus, reason, purgeScheduledFor, operator: session })

  await logSuperAdmin(session, {
    action: `TENANT_${toStatus}`,
    entityType: 'Tenant',
    entityId: tenant._id,
    description: `Tenant ${tenant.companyName} moved from ${fromStatus} to ${toStatus}`,
    reason,
    oldValue: fromStatus,
    newValue: toStatus,
    req,
  })

  if (toStatus === 'PURGE_SCHEDULED') {
    await PlatformComplianceRequest.create({
      type: 'TENANT_PURGE',
      tenant: tenant._id,
      title: `Tenant purge approval: ${tenant.companyName}`,
      status: 'PENDING_APPROVAL',
      severity: 'HIGH',
      reason,
      scheduledFor: updated.purgeScheduledFor,
      reminderAt: new Date(updated.purgeScheduledFor.getTime() - 3 * 86400000),
      metadata: { lifecycleEvent: `Tenant moved from ${fromStatus} to ${toStatus}` },
      createdBy: session.sub,
    })
  }

  return ok(updated, `Tenant moved to ${toStatus}`)
})
