import Tenant from '@/models/Tenant'
import Plan from '@/models/Plan'
import Subscription from '@/models/Subscription'
import Employee from '@/models/Employee'
import TenantProvisioningJob from '@/models/TenantProvisioningJob'
import TenantProvisioningStep, { PROVISIONING_STEP_KEYS } from '@/models/TenantProvisioningStep'
import TenantLifecycleEvent from '@/models/TenantLifecycleEvent'
import { hashPassword } from '@/lib/auth'
import { findUserByEmail } from '@/lib/userLookup'
import { buildTenantDatabaseName, provisionTenantDatabase, runForTenant } from '@/lib/tenantDb'
import { ApiError } from '@/lib/auth'

// Subdomains that could be confused for platform infrastructure, or that
// collide with routes this app itself serves. The subdomain is a business
// identifier only — it is never used as the tenant-security boundary — but
// a tenant claiming one of these would still be confusing/phishable, so
// creation is blocked outright.
export const RESERVED_SUBDOMAINS = new Set([
  'www', 'api', 'app', 'admin', 'administrator', 'superadmin', 'platform', 'system', 'internal',
  'mail', 'email', 'smtp', 'ftp', 'ssh', 'root',
  'blog', 'help', 'support', 'status', 'docs', 'documentation',
  'dev', 'develop', 'staging', 'stage', 'test', 'testing', 'demo', 'sandbox',
  'cdn', 'static', 'assets', 'media', 'files',
  'dashboard', 'portal', 'console', 'my', 'account', 'accounts',
  'login', 'logout', 'auth', 'sso', 'oauth',
  'billing', 'payments', 'pay', 'secure', 'ssl',
  'nexahr', 'kriscel', 'kriscel-tech',
])

function normalizeSubdomain(value) {
  return String(value || '').trim().toLowerCase()
}

export async function checkCompanyCodeAvailability(code) {
  const normalized = String(code || '').trim().toUpperCase()
  if (!normalized) return { available: false, reason: 'Company code is required' }
  if (!/^[A-Z0-9]{2,20}$/.test(normalized)) {
    return { available: false, reason: 'Company code must be 2-20 letters/numbers only' }
  }
  const existing = await Tenant.findOne({ tenantCode: normalized, deleted: false })
  return existing ? { available: false, reason: 'This company code is already in use' } : { available: true }
}

export async function checkSubdomainAvailability(subdomain) {
  const normalized = normalizeSubdomain(subdomain)
  if (!normalized) return { available: false, reason: 'Subdomain is required' }
  if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(normalized)) {
    return { available: false, reason: 'Subdomain must be lowercase letters, numbers and hyphens only' }
  }
  if (RESERVED_SUBDOMAINS.has(normalized)) {
    return { available: false, reason: 'This subdomain is reserved' }
  }
  const existing = await Tenant.findOne({ subdomain: normalized, deleted: false })
  return existing ? { available: false, reason: 'This subdomain is already taken' } : { available: true }
}

export async function checkAdminEmailAvailability(email) {
  const normalized = String(email || '').trim().toLowerCase()
  if (!normalized) return { available: false, reason: 'Admin email is required' }
  // findUserByEmail already checks platform operators first, then every
  // tenant's Employee collection — the same lookup login itself uses, so
  // "available" here means the same thing "not already an account" does
  // everywhere else in the app.
  const found = await findUserByEmail(normalized)
  return found ? { available: false, reason: 'This email is already in use by another account' } : { available: true }
}

// ---------------------------------------------------------------------------
// Lifecycle state machine
// ---------------------------------------------------------------------------

export const TENANT_STATUSES = ['TRIAL', 'ACTIVE', 'GRACE', 'SUSPENDED', 'ARCHIVED', 'PURGE_SCHEDULED', 'PURGED']

const LIFECYCLE_TRANSITIONS = {
  TRIAL: ['ACTIVE', 'GRACE', 'SUSPENDED', 'ARCHIVED'],
  ACTIVE: ['GRACE', 'SUSPENDED', 'ARCHIVED'],
  GRACE: ['ACTIVE', 'SUSPENDED', 'ARCHIVED'],
  SUSPENDED: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: ['ACTIVE', 'PURGE_SCHEDULED'],
  PURGE_SCHEDULED: ['ARCHIVED'],
  PURGED: [],
}

export function getRequiredPermissionForTransition(fromStatus, toStatus) {
  if (fromStatus === 'PURGE_SCHEDULED' && toStatus === 'ARCHIVED') return 'tenant.cancel_purge'
  return {
    ACTIVE: 'tenant.activate',
    GRACE: 'tenant.suspend',
    SUSPENDED: 'tenant.suspend',
    ARCHIVED: 'tenant.archive',
    PURGE_SCHEDULED: 'tenant.schedule_purge',
  }[toStatus]
}

export function assertValidTransition(fromStatus, toStatus) {
  const allowed = LIFECYCLE_TRANSITIONS[fromStatus] || []
  if (!allowed.includes(toStatus)) {
    throw new ApiError(400, `Cannot move a tenant from ${fromStatus} to ${toStatus}`, 'INVALID_TRANSITION')
  }
}

const MIN_PURGE_DELAY_DAYS = 14

export async function applyLifecycleTransition({ tenant, toStatus, reason, purgeScheduledFor, operator }) {
  const fromStatus = tenant.status
  assertValidTransition(fromStatus, toStatus)

  if (toStatus === 'PURGE_SCHEDULED') {
    const scheduledDate = purgeScheduledFor ? new Date(purgeScheduledFor) : null
    const minDate = new Date(Date.now() + MIN_PURGE_DELAY_DAYS * 86400000)
    if (!scheduledDate || Number.isNaN(scheduledDate.getTime()) || scheduledDate < minDate) {
      throw new ApiError(400, `Purge must be scheduled at least ${MIN_PURGE_DELAY_DAYS} days out`, 'PURGE_DELAY_TOO_SHORT')
    }
    tenant.purgeScheduledFor = scheduledDate
  } else if (fromStatus === 'PURGE_SCHEDULED') {
    tenant.purgeScheduledFor = null
  }

  if (toStatus === 'ARCHIVED') tenant.archivedAt = new Date()
  if (toStatus === 'GRACE') tenant.graceEndsAt = purgeScheduledFor ? new Date(purgeScheduledFor) : null
  if (toStatus === 'ACTIVE' || toStatus === 'TRIAL') tenant.graceEndsAt = null

  tenant.status = toStatus
  tenant.suspensionReason = reason
  tenant.updatedBy = operator.sub
  await tenant.save()

  await TenantLifecycleEvent.create({
    tenant: tenant._id,
    fromStatus,
    toStatus,
    reason,
    purgeScheduledFor: tenant.purgeScheduledFor,
    performedBy: operator.userId,
    performedByEmail: operator.sub,
  })

  return tenant
}

// ---------------------------------------------------------------------------
// Idempotent provisioning workflow
// ---------------------------------------------------------------------------

async function ensureStepRecords(jobId) {
  const existing = await TenantProvisioningStep.find({ job: jobId })
  const byKey = new Map(existing.map((s) => [s.stepKey, s]))
  const steps = []
  for (let i = 0; i < PROVISIONING_STEP_KEYS.length; i++) {
    const key = PROVISIONING_STEP_KEYS[i]
    if (byKey.has(key)) {
      steps.push(byKey.get(key))
    } else {
      steps.push(await TenantProvisioningStep.create({ job: jobId, stepKey: key, order: i }))
    }
  }
  return steps
}

const STEP_RUNNERS = {
  async VALIDATE({ payload }) {
    const [code, subdomain, adminEmail] = await Promise.all([
      checkCompanyCodeAvailability(payload.tenantCode),
      payload.subdomain ? checkSubdomainAvailability(payload.subdomain) : Promise.resolve({ available: true }),
      checkAdminEmailAvailability(payload.adminEmail),
    ])
    if (!code.available) throw new Error(code.reason)
    if (!subdomain.available) throw new Error(subdomain.reason)
    if (!adminEmail.available) throw new Error(adminEmail.reason)
    return { validated: true }
  },

  async CREATE_TENANT({ job, payload }) {
    if (job.tenant) return { tenantId: String(job.tenant) }

    const tenantCode = String(payload.tenantCode).trim().toUpperCase()
    const tenant = await Tenant.create({
      tenantCode,
      companyName: payload.companyName,
      email: payload.email,
      phone: payload.phone,
      subdomain: payload.subdomain ? normalizeSubdomain(payload.subdomain) : undefined,
      logoUrl: payload.logoUrl,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      gstNumber: payload.gstNumber,
      panNumber: payload.panNumber,
      industryType: payload.industryType,
      employeeLimit: payload.employeeLimit ?? 50,
      databaseName: buildTenantDatabaseName(tenantCode),
      databaseStatus: 'PENDING',
      plan: payload.planId || null,
      status: 'TRIAL',
      provisioningStatus: 'PROVISIONING',
      provisioningJob: job._id,
      timezone: payload.timezone || 'Asia/Kolkata',
      currency: payload.currency || 'INR',
      sendLoginInvitation: !!payload.sendLoginInvitation,
      adminEmail: payload.adminEmail,
      hrSettings: {
        employeeIdPrefix: payload.employeeIdPrefix || 'EMP',
        workingDays: Array.isArray(payload.workingDays) ? payload.workingDays : [],
        weeklyOff: Array.isArray(payload.weeklyOff) ? payload.weeklyOff : [],
        officeStartTime: payload.officeStartTime || '09:00',
        officeEndTime: payload.officeEndTime || '18:00',
      },
      payrollDefaults: {
        payFrequency: payload.payFrequency || 'MONTHLY',
        payrollCutoffDay: payload.payrollCutoffDay || 25,
      },
      securityDefaults: {
        allowedEmailDomains: Array.isArray(payload.allowedEmailDomains) ? payload.allowedEmailDomains : [],
        sessionTimeoutMinutes: payload.sessionTimeoutMinutes || 60,
      },
      features: payload.features || {},
      createdBy: job.requestedBy ? String(job.requestedBy) : null,
    })

    return { tenantId: String(tenant._id) }
  },

  async PROVISION_DATABASE({ tenant, job }) {
    await provisionTenantDatabase(tenant, { createdBy: job.requestedBy ? String(job.requestedBy) : null })
    return { databaseName: tenant.databaseName }
  },

  async SEED_TENANT_DATA({ tenant }) {
    // Reference-data seeding (the per-tenant Permission copy) already
    // happens inside PROVISION_DATABASE — this step just checks it landed,
    // so a failure here is visible and retryable on its own rather than
    // silently folded into the database step.
    const fresh = await Tenant.findById(tenant._id)
    if (fresh.databaseStatus !== 'READY') throw new Error('Tenant database is not ready yet')
    return { confirmed: true }
  },

  async CREATE_PRIMARY_ADMIN({ tenant, payload, job }) {
    return runForTenant(tenant, async () => {
      const existing = await Employee.findOne({ email: payload.adminEmail, tenantId: tenant._id, deleted: false })
      if (existing) return { employeeId: String(existing._id), reusedExisting: true }

      const parts = String(payload.adminName).trim().split(/\s+/)
      const firstName = parts[0]
      const lastName = parts.slice(1).join(' ') || '-'

      let tempPassword = job.adminTempPassword
      if (!tempPassword) {
        tempPassword = `Nexahr@${1000 + Math.floor(Math.random() * 9000)}`
        job.adminTempPassword = tempPassword
        await job.save()
      }

      const employee = await Employee.create({
        employeeCode: 'EMP00001',
        firstName,
        lastName,
        email: payload.adminEmail,
        password: await hashPassword(tempPassword),
        phone: payload.adminPhone,
        role: 'COMPANY_ADMIN',
        status: 'ACTIVE',
        tenantId: tenant._id,
        createdBy: job.requestedBy ? String(job.requestedBy) : null,
      })

      return { employeeId: String(employee._id) }
    })
  },

  async CREATE_SUBSCRIPTION({ tenant, payload }) {
    if (!payload.planId) return { skipped: true, reason: 'No plan selected' }

    const existing = await Subscription.findOne({ tenant: tenant._id })
    if (existing) return { subscriptionId: String(existing._id), reusedExisting: true }

    const plan = await Plan.findById(payload.planId)
    if (!plan) return { skipped: true, reason: 'Selected plan no longer exists' }

    const startDate = payload.subscriptionStartDate ? new Date(payload.subscriptionStartDate) : new Date()
    const endDate = payload.subscriptionEndDate
      ? new Date(payload.subscriptionEndDate)
      : new Date(startDate.getTime() + (plan.trialDays || 14) * 86400000)

    const subscription = await Subscription.create({
      tenant: tenant._id,
      plan: plan._id,
      startDate,
      endDate,
      status: 'TRIAL',
      autoRenew: false,
    })

    return { subscriptionId: String(subscription._id) }
  },

  async SEND_INVITATION({ tenant, payload, job }) {
    // No email service exists in this app yet (forgot-password has the same
    // limitation) — logging is the honest equivalent rather than a fake
    // "sent" status.
    if (!payload.sendLoginInvitation) return { sent: false, reason: 'Invitation not requested' }
    console.log(`[tenant invitation] ${payload.adminEmail} for ${tenant.companyName}: temp password ${job.adminTempPassword || '(already set on a prior attempt)'}`)
    return { logged: true }
  },

  async FINALIZE({ tenant }) {
    tenant.provisioningStatus = 'COMPLETED'
    tenant.lastActivityAt = new Date()
    await tenant.save()
    return { finalizedAt: new Date().toISOString() }
  },
}

export async function runProvisioningJob(jobId) {
  const job = await TenantProvisioningJob.findById(jobId)
  if (!job) throw new ApiError(404, 'Provisioning job not found', 'JOB_NOT_FOUND')
  if (job.status === 'COMPLETED') return job

  job.attempts += 1
  job.startedAt = job.startedAt || new Date()
  job.status = 'VALIDATING'
  job.error = null
  await job.save()

  const steps = await ensureStepRecords(job._id)
  let tenant = job.tenant ? await Tenant.findById(job.tenant) : null

  try {
    for (const step of steps) {
      if (step.status === 'COMPLETED' || step.status === 'SKIPPED') continue

      step.status = 'RUNNING'
      step.attempts += 1
      step.startedAt = step.startedAt || new Date()
      await step.save()
      job.status = step.stepKey === 'VALIDATE' ? 'VALIDATING' : 'PROVISIONING'
      await job.save()

      try {
        const output = await STEP_RUNNERS[step.stepKey]({ job, tenant, payload: job.payload })
        step.status = 'COMPLETED'
        step.output = output || null
        step.error = null
        step.completedAt = new Date()
        await step.save()

        if (step.stepKey === 'CREATE_TENANT' && output?.tenantId) {
          job.tenant = output.tenantId
          await job.save()
          tenant = await Tenant.findById(output.tenantId)
        }
      } catch (err) {
        step.status = 'FAILED'
        step.error = err.message
        await step.save()
        throw err
      }
    }

    job.status = 'COMPLETED'
    job.completedAt = new Date()
    await job.save()
    return job
  } catch (err) {
    const anyCompleted = steps.some((s) => s.status === 'COMPLETED')
    job.status = anyCompleted ? 'PARTIALLY_COMPLETED' : 'FAILED'
    job.error = err.message
    await job.save()
    if (tenant) {
      tenant.provisioningStatus = job.status
      await tenant.save()
    }
    throw err
  }
}

export async function findOrCreateProvisioningJob({ idempotencyKey, payload, requestedBy }) {
  const existing = await TenantProvisioningJob.findOne({ idempotencyKey })
  if (existing) return existing
  return TenantProvisioningJob.create({ idempotencyKey, payload, requestedBy })
}
