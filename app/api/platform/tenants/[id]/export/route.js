export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import Tenant from '@/models/Tenant'
import Subscription from '@/models/Subscription'
import TenantLifecycleEvent from '@/models/TenantLifecycleEvent'

// Tenant-level metadata only — company profile, plan/limits, lifecycle
// history. Never touches the tenant's own database, so no employee or
// payroll records are ever part of this export.
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.export_metadata')

  const tenant = await Tenant.findOne({ _id: params.id, deleted: false }).populate('plan').lean()
  if (!tenant) return fail('Tenant not found', 404)

  const [subscription, lifecycle] = await Promise.all([
    Subscription.findOne({ tenant: params.id }).populate('plan', 'name').lean(),
    TenantLifecycleEvent.find({ tenant: params.id }).sort({ createdAt: 1 }).lean(),
  ])

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    exportedBy: session.sub,
    tenant: {
      tenantCode: tenant.tenantCode,
      companyName: tenant.companyName,
      email: tenant.email,
      phone: tenant.phone,
      subdomain: tenant.subdomain,
      address: tenant.address, city: tenant.city, state: tenant.state, country: tenant.country,
      gstNumber: tenant.gstNumber, panNumber: tenant.panNumber, industryType: tenant.industryType,
      status: tenant.status, provisioningStatus: tenant.provisioningStatus,
      employeeLimit: tenant.employeeLimit, storageLimitMb: tenant.storageLimitMb,
      apiQuota: tenant.apiQuota, integrationLimit: tenant.integrationLimit,
      timezone: tenant.timezone, currency: tenant.currency,
      plan: tenant.plan?.name || null,
      adminEmail: tenant.adminEmail,
      createdAt: tenant.createdAt,
      archivedAt: tenant.archivedAt,
      purgeScheduledFor: tenant.purgeScheduledFor,
    },
    subscription: subscription ? {
      plan: subscription.plan?.name, status: subscription.status,
      startDate: subscription.startDate, endDate: subscription.endDate, trialEndDate: subscription.trialEndDate,
    } : null,
    lifecycleHistory: lifecycle.map((e) => ({ from: e.fromStatus, to: e.toStatus, reason: e.reason, at: e.createdAt })),
  }

  await logSuperAdmin(session, {
    action: 'TENANT_METADATA_EXPORTED',
    entityType: 'Tenant',
    entityId: params.id,
    description: `Metadata exported for ${tenant.companyName}`,
    req,
  })

  return ok(exportPayload, 'Export ready')
})
