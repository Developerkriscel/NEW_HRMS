export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, paged } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import AuditLog from '@/models/AuditLog'
import Subscription from '@/models/Subscription'
import Tenant from '@/models/Tenant'
import { devSuperAdminStore } from '@/lib/devSuperAdminStore'

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'audit.view')
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 50)
  if (session.devLogin && process.env.NODE_ENV !== 'production') {
    return ok(devSuperAdminStore.auditLogs({ page, size, tenantId: params.id }))
  }

  // Actions performed ON this tenant are logged with entityType:'Tenant',
  // entityId:<tenantId> (super-admin actor, so AuditLog.tenantId is null —
  // see lib/audit.js). Related-entity actions (provisioning job,
  // subscription) carry the *related* entity's id, not the tenant's, so
  // those are pulled in explicitly rather than missed by an entityId-only
  // match.
  const tenant = await Tenant.findById(params.id).select('provisioningJob').lean()
  const subscription = await Subscription.findOne({ tenant: params.id }).select('_id').lean()

  const relatedIds = [params.id]
  if (tenant?.provisioningJob) relatedIds.push(String(tenant.provisioningJob))
  if (subscription?._id) relatedIds.push(String(subscription._id))

  const query = { $or: [{ tenantId: params.id }, { entityId: { $in: relatedIds } }] }
  const totalElements = await AuditLog.countDocuments(query)
  const content = await AuditLog.find(query).sort({ createdAt: -1 }).skip(page * size).limit(size)

  return ok(paged(content, page, size, totalElements))
})
