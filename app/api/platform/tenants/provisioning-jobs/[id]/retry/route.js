export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import { runProvisioningJob } from '@/lib/platformTenancy'
import TenantProvisioningJob from '@/models/TenantProvisioningJob'

const RETRYABLE_STATUSES = new Set(['FAILED', 'PARTIALLY_COMPLETED'])

// Re-runs a stalled job — already-COMPLETED steps are skipped (see
// lib/platformTenancy.js), so this only re-attempts whatever actually
// failed. Safe to call repeatedly; it can never re-create the tenant or a
// second primary-admin account.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.create')

  const job = await TenantProvisioningJob.findById(params.id)
  if (!job) return fail('Provisioning job not found', 404)
  if (!RETRYABLE_STATUSES.has(job.status)) {
    return fail(`Job is ${job.status} and cannot be retried`, 400, 'NOT_RETRYABLE')
  }

  try {
    await runProvisioningJob(job._id)
  } catch (err) {
    // outcome is read from the persisted job below either way
  }

  const finished = await TenantProvisioningJob.findById(job._id).populate('tenant')

  await logSuperAdmin(session, {
    action: 'TENANT_PROVISIONING_RETRY',
    entityType: 'TenantProvisioningJob',
    entityId: finished._id,
    description: `Provisioning retry for job ${finished._id}: ${finished.status}`,
    req,
  })

  if (finished.status === 'FAILED' || finished.status === 'PARTIALLY_COMPLETED') {
    return fail(finished.error || 'Retry did not complete', 422, finished.status)
  }

  return ok(finished, 'Provisioning retried')
})
