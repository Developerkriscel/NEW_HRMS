export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { computeUsageSnapshot } from '@/lib/platformBilling'
import Tenant from '@/models/Tenant'
import TenantUsage from '@/models/TenantUsage'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.view')

  const history = await TenantUsage.find({ tenant: params.id }).sort({ snapshotAt: -1 }).limit(30)
  return ok({ latest: history[0] || null, history })
})

// Computes a fresh snapshot on demand — there is no scheduled job to do
// this automatically yet (see the Phase 0 architecture assessment on
// background-job infrastructure).
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.view')

  const tenant = await Tenant.findOne({ _id: params.id, deleted: false })
  if (!tenant) return fail('Tenant not found', 404)

  const snapshot = await computeUsageSnapshot(tenant)
  return ok(snapshot, 'Usage snapshot recomputed')
})
