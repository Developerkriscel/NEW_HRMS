import PlatformOperator from '@/models/PlatformOperator'
import Employee from '@/models/Employee'
import '@/models/Permission'
import Tenant from '@/models/Tenant'
import AccountSession from '@/models/AccountSession'
import { getTenantModelForDatabase, resolveTenantDatabase } from '@/lib/tenantDb'
import { resolveOperatorPermissions } from '@/lib/platformRbac'
import { companySlugFor } from '@/lib/publicJobHelpers'
import { findDirectoryTenantId, rememberLoginDirectoryEntry } from '@/lib/loginDirectory'

const EMAIL_TENANT_HINTS = global.__nexahrEmailTenantHints || new Map()
if (!global.__nexahrEmailTenantHints) global.__nexahrEmailTenantHints = EMAIL_TENANT_HINTS
const USER_LOOKUP_MAX_TIME_MS = Number(process.env.USER_LOOKUP_MAX_TIME_MS || 3000)
const USER_LOOKUP_SCAN_BATCH_SIZE = Number(process.env.USER_LOOKUP_SCAN_BATCH_SIZE || 16)
const USER_LOOKUP_TENANT_CACHE_TTL_MS = Number(process.env.USER_LOOKUP_TENANT_CACHE_TTL_MS || 60000)
const USER_LOOKUP_SLOW_LOG_MS = Number(process.env.USER_LOOKUP_SLOW_LOG_MS || 1000)
const tenantScanCache = global.__nexahrTenantScanCache || { expiresAt: 0, tenants: null }
if (!global.__nexahrTenantScanCache) global.__nexahrTenantScanCache = tenantScanCache
const TENANT_BY_ID_CACHE = global.__nexahrTenantByIdCache || new Map()
if (!global.__nexahrTenantByIdCache) global.__nexahrTenantByIdCache = TENANT_BY_ID_CACHE

const AUTH_EMPLOYEE_SELECT = 'firstName lastName email password role status tenantId permissions moduleAccess'
const AUTH_OPERATOR_SELECT = 'name email password status active mfaEnabled'

// Mirrors UserDetailsServiceImpl.loadUserByUsername: super admins take
// priority over tenant employees when an email collides across both.
async function findTenantEmployeeByEmail(email, tenant) {
  const resolved = tenant.databaseName
    ? { tenantId: String(tenant._id), databaseName: tenant.databaseName, tenant }
    : await resolveTenantDatabase(tenant._id)

  const TenantEmployee = getTenantModelForDatabase('Employee', resolved.databaseName)
  const employee = await TenantEmployee.findOne({
    email,
    tenantId: resolved.tenantId,
    deleted: false,
  })
    .select(AUTH_EMPLOYEE_SELECT)
    .maxTimeMS(USER_LOOKUP_MAX_TIME_MS)

  return employee
    ? { isSuperAdmin: false, doc: employee, tenant: resolved.tenant, databaseName: resolved.databaseName }
    : null
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function emailDomain(email) {
  const [, domain] = String(email || '').split('@')
  return domain ? domain.toLowerCase() : ''
}

function tenantMatchesEmailDomain(tenant, domain) {
  if (!domain) return false
  const allowedDomains = tenant.securityDefaults?.allowedEmailDomains || []
  if (allowedDomains.some((item) => String(item || '').trim().toLowerCase() === domain)) return true
  return [tenant.email, tenant.adminEmail]
    .map((email) => emailDomain(email))
    .some((tenantDomain) => tenantDomain === domain)
}

function prioritizeTenantsByEmailDomain(tenants, email) {
  const domain = emailDomain(email)
  if (!domain) return tenants
  const matches = []
  const rest = []
  for (const tenant of tenants) {
    if (tenantMatchesEmailDomain(tenant, domain)) matches.push(tenant)
    else rest.push(tenant)
  }
  return matches.length ? [...matches, ...rest] : tenants
}

function rememberTenantHint(email, found) {
  if (!found?.tenant?._id) return
  EMAIL_TENANT_HINTS.set(email, {
    tenantId: String(found.tenant._id),
    databaseName: found.databaseName || found.tenant.databaseName || null,
  })
  rememberLoginDirectoryEntry(found).catch((err) => {
    console.warn(`[auth:directory] failed to remember ${email}: ${err.message}`)
  })
}

async function tryTenantById(email, tenantId) {
  if (!tenantId) return null
  const cacheKey = String(tenantId)
  const cached = TENANT_BY_ID_CACHE.get(cacheKey)
  let tenant = cached && cached.expiresAt > Date.now() ? cached.tenant : null
  if (!tenant) {
    tenant = await Tenant.findOne({ _id: tenantId, deleted: false })
      .select('_id tenantCode companyName email adminEmail databaseName databaseStatus securityDefaults.allowedEmailDomains')
      .maxTimeMS(USER_LOOKUP_MAX_TIME_MS)
    if (tenant) {
      TENANT_BY_ID_CACHE.set(cacheKey, { tenant, expiresAt: Date.now() + USER_LOOKUP_TENANT_CACHE_TTL_MS })
    }
  }
  if (!tenant) return null
  const found = await findTenantEmployeeByEmail(email, tenant)
  if (found) rememberTenantHint(email, found)
  return found
}

async function findRecentSessionTenantId(email) {
  const session = await AccountSession.findOne({
    email,
    tenantId: { $ne: null },
    expiresAt: { $gt: new Date() },
  })
    .select('tenantId')
    .sort({ lastSeenAt: -1, createdAt: -1 })
    .maxTimeMS(USER_LOOKUP_MAX_TIME_MS)
    .lean()
  return session?.tenantId ? String(session.tenantId) : null
}

async function getScannableTenants() {
  if (tenantScanCache.tenants && tenantScanCache.expiresAt > Date.now()) {
    return tenantScanCache.tenants
  }
  const tenants = await Tenant.find({
    deleted: false,
    status: { $ne: 'CANCELLED' },
  }).select('_id tenantCode companyName email adminEmail databaseName databaseStatus securityDefaults.allowedEmailDomains').maxTimeMS(USER_LOOKUP_MAX_TIME_MS)
  tenantScanCache.tenants = tenants
  tenantScanCache.expiresAt = Date.now() + USER_LOOKUP_TENANT_CACHE_TTL_MS
  return tenants
}

async function scanTenantsInBatches(email, tenants, batchSize = USER_LOOKUP_SCAN_BATCH_SIZE) {
  for (let i = 0; i < tenants.length; i += batchSize) {
    const batch = tenants.slice(i, i + batchSize)
    const results = await Promise.all(batch.map(async (tenant) => {
      try {
        return await findTenantEmployeeByEmail(email, tenant)
      } catch (err) {
        console.warn(`[auth:tenant-scan] skipped tenant ${tenant._id}: ${err.message}`)
        return null
      }
    }))
    const found = results.find(Boolean)
    if (found) {
      rememberTenantHint(email, found)
      return found
    }
  }
  return null
}

export async function findUserByEmail(email, options = {}) {
  const startedAt = Date.now()
  const normalizedEmail = normalizeEmail(email)
  try {
    const superAdmin = await PlatformOperator.findOne({ email: normalizedEmail })
      .select(AUTH_OPERATOR_SELECT)
      .maxTimeMS(USER_LOOKUP_MAX_TIME_MS)
    if (superAdmin) return { isSuperAdmin: true, doc: superAdmin }

    if (options.tenantId) {
      const scoped = await tryTenantById(normalizedEmail, options.tenantId)
      if (scoped) return scoped
    }

    const hintedTenantId = EMAIL_TENANT_HINTS.get(normalizedEmail)?.tenantId
    const hinted = await tryTenantById(normalizedEmail, hintedTenantId)
    if (hinted) return hinted

    const directoryTenantId = await findDirectoryTenantId(normalizedEmail)
    const directoryFound = await tryTenantById(normalizedEmail, directoryTenantId)
    if (directoryFound) return directoryFound

    const recentTenantId = await findRecentSessionTenantId(normalizedEmail)
    const recentSessionFound = await tryTenantById(normalizedEmail, recentTenantId)
    if (recentSessionFound) return recentSessionFound

    const adminTenant = await Tenant.findOne({ adminEmail: normalizedEmail, deleted: false })
      .select('_id tenantCode companyName databaseName databaseStatus')
      .maxTimeMS(USER_LOOKUP_MAX_TIME_MS)
    if (adminTenant) {
      const found = await findTenantEmployeeByEmail(normalizedEmail, adminTenant)
      if (found) {
        rememberTenantHint(normalizedEmail, found)
        return found
      }
    }

    const tenants = await getScannableTenants()

    const remainingTenants = adminTenant
      ? tenants.filter((tenant) => String(tenant._id) !== String(adminTenant._id))
      : tenants
    const tenantFound = await scanTenantsInBatches(normalizedEmail, prioritizeTenantsByEmailDomain(remainingTenants, normalizedEmail))
    if (tenantFound) return tenantFound

    // Legacy fallback for records created before per-tenant databases existed.
    const employee = await Employee.findOne({ email: normalizedEmail, deleted: false })
      .select(AUTH_EMPLOYEE_SELECT)
      .maxTimeMS(USER_LOOKUP_MAX_TIME_MS)
      .populate('permissions', 'name')
    if (employee) return { isSuperAdmin: false, doc: employee }

    return null
  } finally {
    const elapsedMs = Date.now() - startedAt
    if (elapsedMs >= USER_LOOKUP_SLOW_LOG_MS) {
      console.warn(`[auth:lookup:slow] ${normalizedEmail} ${elapsedMs}ms`)
    }
  }
}

export function isAccountUsable(found) {
  if (found.isSuperAdmin) return found.doc.active && found.doc.status !== 'SUSPENDED'
  return found.doc.status === 'ACTIVE' || found.doc.status === 'PROBATION'
}

async function ensureEmployeePermissions(found) {
  if (found.isSuperAdmin || !found.doc?.populate) return found
  const firstPermission = found.doc.permissions?.[0]
  if (!firstPermission || firstPermission.name) return found
  await found.doc.populate('permissions', 'name')
  return found
}

export async function buildUserInfo(found) {
  if (found.isSuperAdmin) {
    const { roles, permissions } = await resolveOperatorPermissions(found.doc._id)
    return {
      id: String(found.doc._id),
      name: found.doc.name,
      email: found.doc.email,
      role: 'SUPER_ADMIN',
      tenantId: null,
      companyName: null,
      permissions: [],
      platformRoles: roles,
      platformPermissions: permissions,
      mfaEnabled: !!found.doc.mfaEnabled,
    }
  }
  await ensureEmployeePermissions(found)
  const emp = found.doc
  const tenant = found.tenant || await Tenant.findById(emp.tenantId).lean()
  return {
    id: String(emp._id),
    name: emp.getFullName ? emp.getFullName() : `${emp.firstName} ${emp.lastName}`,
    email: emp.email,
    role: emp.role,
    tenantId: String(emp.tenantId),
    companyName: tenant?.companyName || null,
    companySlug: tenant ? companySlugFor(tenant) : null,
    permissions: (emp.permissions || []).map((p) => (typeof p === 'string' ? p : p.name)),
    moduleAccess: emp.moduleAccess || [],
  }
}

// Builds the session-shaped "user" object expected by generateAccessToken/
// generateRefreshToken in lib/auth.js.
export async function toAuthUser(found) {
  if (found.isSuperAdmin) {
    const { roles, permissions } = await resolveOperatorPermissions(found.doc._id)
    return {
      _id: found.doc._id,
      name: found.doc.name,
      email: found.doc.email,
      isSuperAdmin: true,
      platformRoles: roles,
      platformPermissions: permissions,
    }
  }
  await ensureEmployeePermissions(found)
  const tenant = found.tenant || await Tenant.findById(found.doc.tenantId).lean()
  return {
    _id: found.doc._id,
    name: found.doc.getFullName ? found.doc.getFullName() : `${found.doc.firstName} ${found.doc.lastName}`,
    email: found.doc.email,
    isSuperAdmin: false,
    role: found.doc.role,
    tenantId: found.doc.tenantId,
    companyName: tenant?.companyName || null,
    companySlug: tenant ? companySlugFor(tenant) : null,
    permissions: found.doc.permissions || [],
    moduleAccess: found.doc.moduleAccess || [],
  }
}
