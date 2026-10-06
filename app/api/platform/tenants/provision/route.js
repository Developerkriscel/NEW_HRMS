import mongoose from 'mongoose'
import PlatformOperator from '@/models/PlatformOperator'
export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import { logSuperAdmin } from '@/lib/audit'
import { findOrCreateProvisioningJob, runProvisioningJob } from '@/lib/platformTenancy'
import TenantProvisioningJob from '@/models/TenantProvisioningJob'

const REQUIRED_FIELDS = ['companyName', 'tenantCode', 'email', 'adminName', 'adminEmail']
const runningProvisioningJobs = global._nexahrRunningProvisioningJobs || new Set()
global._nexahrRunningProvisioningJobs = runningProvisioningJobs

function generateTempPassword() {
  return `Nexahr@${1000 + Math.floor(Math.random() * 9000)}`
}

function serializeJob(job) {
  const obj = job?.toObject ? job.toObject() : job
  if (!obj) return null
  return { ...obj, adminTempPassword: undefined }
}

function startProvisioningInBackground(jobId, session, payload) {
  const key = String(jobId)
  if (runningProvisioningJobs.has(key)) return
  runningProvisioningJobs.add(key)

  setTimeout(async () => {
    try {
      const finished = await runProvisioningJob(jobId)
      await logSuperAdmin(session, {
        action: `TENANT_PROVISIONING_${finished.status}`,
        entityType: 'TenantProvisioningJob',
        entityId: finished._id,
        description: `Provisioning for ${payload.companyName}`,
      })
    } catch (err) {
      console.error('background tenant provisioning failed', err)
    } finally {
      runningProvisioningJobs.delete(key)
    }
  }, 0)
}

// Starts (or safely resumes) a provisioning job. The client keeps one
// idempotency key per draft, so retries reuse the same job instead of
// creating duplicate tenants. Heavy tenant setup runs after the response.
export const POST = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'tenant.create')

  const body = await req.json()
  const { idempotencyKey, payload, adminPassword } = body
  if (!idempotencyKey) return fail('idempotencyKey is required', 400)
  if (!payload) return fail('payload is required', 400)
  if (adminPassword && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(adminPassword)) {
    return fail('Admin password must be at least 8 characters and include uppercase, lowercase and a number', 400, 'VALIDATION_ERROR')
  }

  const missing = REQUIRED_FIELDS.filter((field) => !payload[field])
  if (missing.length) return fail(`Missing required fields: ${missing.join(', ')}`, 400, 'VALIDATION_ERROR')

  let operatorId = null
  if (session.userId && mongoose.Types.ObjectId.isValid(session.userId)) {
    operatorId = new mongoose.Types.ObjectId(session.userId)
  } else {
    const op = await PlatformOperator.findOne({ email: session.sub || 'admin@nexahr.io' }).select('_id')
    operatorId = op?._id || new mongoose.Types.ObjectId('6a884143395aab2a599e82b2')
  }

  const job = await findOrCreateProvisioningJob({ idempotencyKey, payload, requestedBy: operatorId })

  if (!job.adminTempPassword && !job.tenant) {
    job.adminTempPassword = adminPassword || generateTempPassword()
    await job.save()
  }

  if (job.status !== 'COMPLETED') {
    startProvisioningInBackground(job._id, session, payload)
  }

  const current = await TenantProvisioningJob.findById(job._id).select('+adminTempPassword').populate('tenant')
  if (!current) return fail('Provisioning job not found after creation', 500, 'JOB_NOT_FOUND')

  const tempPassword = current.adminTempPassword
  const responseJob = serializeJob(current)

  if (current.status === 'FAILED' || current.status === 'PARTIALLY_COMPLETED') {
    return fail(current.error || 'Provisioning did not complete', 422, current.status, { job: responseJob, tempPassword })
  }

  return ok(
    { job: responseJob, tempPassword },
    current.status === 'COMPLETED' ? 'Tenant provisioned' : 'Provisioning started',
    current.status === 'COMPLETED' ? 201 : 202
  )
})
