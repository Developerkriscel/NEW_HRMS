import PlatformOperator from '@/models/PlatformOperator'
import Employee from '@/models/Employee'
import '@/models/Permission'
import Tenant from '@/models/Tenant'
import { getTenantModelForDatabase, resolveTenantDatabase } from '@/lib/tenantDb'
import { resolveOperatorPermissions } from '@/lib/platformRbac'
import { companySlugFor } from '@/lib/publicJobHelpers'

const EMAIL_TENANT_HINTS = global.__nexahrEmailTenantHints || new Map()
if (!global.__nexahrEmailTenantHints) global.__nexahrEmailTenantHints = EMAIL_TENANT_HINTS

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

  return employee
    ? { isSuperAdmin: false, doc: employee, tenant: resolved.tenant, databaseName: resolved.databaseName }
    : null
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function rememberTenantHint(email, found) {
  if (!found?.tenant?._id) return
  EMAIL_TENANT_HINTS.set(email, {
    tenantId: String(found.tenant._id),
    databaseName: found.databaseName || found.tenant.databaseName || null,
  })
}

async function tryTenantById(email, tenantId) {
  if (!tenantId) return null
  const tenant = await Tenant.findOne({ _id: tenantId, deleted: false })
  if (!tenant) return null
  const found = await findTenantEmployeeByEmail(email, tenant)
  if (found) rememberTenantHint(email, found)
  return found
}

async function scanTenantsInBatches(email, tenants, batchSize = 8) {
  for (let i = 0; i < tenants.length; i += batchSize) {
    const batch = tenants.slice(i, i + batchSize)
    const results = await Promise.all(batch.map((tenant) => findTenantEmployeeByEmail(email, tenant)))
    const found = results.find(Boolean)
    if (found) {
      rememberTenantHint(email, found)
      return found
    }
  }
  return null
}

export async function findUserByEmail(email, options = {}) {
  const normalizedEmail = normalizeEmail(email)
  const superAdmin = await PlatformOperator.findOne({ email: normalizedEmail })
  if (superAdmin) return { isSuperAdmin: true, doc: superAdmin }

  if (options.tenantId) {
    const scoped = await tryTenantById(normalizedEmail, options.tenantId)
    if (scoped) return scoped
  }

  const hintedTenantId = EMAIL_TENANT_HINTS.get(normalizedEmail)?.tenantId
  const hinted = await tryTenantById(normalizedEmail, hintedTenantId)
  if (hinted) return hinted

  const adminTenant = await Tenant.findOne({ adminEmail: normalizedEmail, deleted: false })
    .select('_id tenantCode companyName databaseName databaseStatus')
  if (adminTenant) {
    const found = await findTenantEmployeeByEmail(normalizedEmail, adminTenant)
    if (found) {
      rememberTenantHint(normalizedEmail, found)
      return found
    }
  }

  const tenants = await Tenant.find({
    deleted: false,
    status: { $ne: 'CANCELLED' },
  }).select('_id tenantCode companyName databaseName databaseStatus')

  const remainingTenants = adminTenant
    ? tenants.filter((tenant) => String(tenant._id) !== String(adminTenant._id))
    : tenants
  const tenantFound = await scanTenantsInBatches(normalizedEmail, remainingTenants)
  if (tenantFound) return tenantFound

  // Legacy fallback for records created before per-tenant databases existed.
  const employee = await Employee.findOne({ email: normalizedEmail, deleted: false }).populate('permissions')
  if (employee) return { isSuperAdmin: false, doc: employee }

  return null
}

export function isAccountUsable(found) {
  if (found.isSuperAdmin) return found.doc.active && found.doc.status !== 'SUSPENDED'
  return found.doc.status === 'ACTIVE' || found.doc.status === 'PROBATION'
}

async function ensureEmployeePermissions(found) {
  if (found.isSuperAdmin || !found.doc?.populate) return found
  const firstPermission = found.doc.permissions?.[0]
  if (!firstPermission || firstPermission.name) return found
  await found.doc.populate('permissions')
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
      email: found.doc.email,
      isSuperAdmin: true,
      platformRoles: roles,
      platformPermissions: permissions,
    }
  }
  await ensureEmployeePermissions(found)
  return {
    _id: found.doc._id,
    email: found.doc.email,
    isSuperAdmin: false,
    role: found.doc.role,
    tenantId: found.doc.tenantId,
    permissions: found.doc.permissions || [],
    moduleAccess: found.doc.moduleAccess || [],
  }
}
