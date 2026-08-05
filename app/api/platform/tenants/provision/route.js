export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import { findOrCreateProvisioningJob, runProvisioningJob } from '@/lib/platformTenancy'
import TenantProvisioningJob from '@/models/TenantProvisioningJob'

const REQUIRED_FIELDS = ['companyName', 'tenantCode', 'email', 'adminName', 'adminEmail']

// Starts (or safely resumes) a provisioning job. The client generates
// `idempotencyKey` once when the wizard is opened and persists it in the
// draft — resubmitting after a timeout, a page reload, or an explicit retry
// all reuse the same key, so this never creates a second Tenant for the
// same submission. Runs the step sequence synchronously and returns the
// outcome; there is no background queue in this deployment (see the Phase 0
// architecture assessment), so a slow step means a slow request rather than
// a silently-stuck job — the client should show progress accordingly.
export const POST = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.create')

  const body = await req.json()
  const { idempotencyKey, payload } = body
  if (!idempotencyKey) return fail('idempotencyKey is required', 400)
  if (!payload) return fail('payload is required', 400)

  const missing = REQUIRED_FIELDS.filter((field) => !payload[field])
  if (missing.length) return fail(`Missing required fields: ${missing.join(', ')}`, 400, 'VALIDATION_ERROR')

  const job = await findOrCreateProvisioningJob({ idempotencyKey, payload, requestedBy: session.userId })

  if (job.status === 'PROVISIONING' || job.status === 'VALIDATING') {
    return fail('This submission is already being provisioned', 409, 'JOB_IN_PROGRESS')
  }

  if (job.status !== 'COMPLETED') {
    try {
      await runProvisioningJob(job._id)
    } catch (err) {
      // The job document itself already carries the failure detail (status +
      // error + per-step breakdown) — surface that instead of a bare 500.
    }

    await logSuperAdmin(session, {
      action: 'TENANT_PROVISIONING_' + job.status,
      entityType: 'TenantProvisioningJob',
      entityId: job._id,
      description: `Provisioning for ${payload.companyName}`,
      req,
    })
  }

  const finished = await TenantProvisioningJob.findById(job._id).select('+adminTempPassword').populate('tenant')
  const tempPassword = finished.adminTempPassword
  const responseJob = { ...finished.toObject(), adminTempPassword: undefined }

  if (finished.status === 'FAILED' || finished.status === 'PARTIALLY_COMPLETED') {
    return fail(finished.error || 'Provisioning did not complete', 422, finished.status, { job: responseJob, tempPassword })
  }

  return ok({ job: responseJob, tempPassword }, finished.status === 'COMPLETED' ? 'Tenant provisioned' : 'Provisioning in progress', 201)
})
