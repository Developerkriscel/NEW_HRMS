import PlatformOperator from '@/models/PlatformOperator'
import Employee from '@/models/Employee'
import Tenant from '@/models/Tenant'
import { getTenantModelForDatabase, resolveTenantDatabase } from '@/lib/tenantDb'
import { resolveOperatorPermissions } from '@/lib/platformRbac'

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
  }).populate('permissions')

  return employee
    ? { isSuperAdmin: false, doc: employee, tenant: resolved.tenant, databaseName: resolved.databaseName }
    : null
}

export async function findUserByEmail(email, options = {}) {
  const superAdmin = await PlatformOperator.findOne({ email })
  if (superAdmin) return { isSuperAdmin: true, doc: superAdmin }

  if (options.tenantId) {
    const tenant = await Tenant.findOne({ _id: options.tenantId, deleted: false })
    if (tenant) {
      const found = await findTenantEmployeeByEmail(email, tenant)
      if (found) return found
    }
  }

  const tenants = await Tenant.find({
    deleted: false,
    status: { $ne: 'CANCELLED' },
  }).select('_id tenantCode companyName databaseName databaseStatus')

  for (const tenant of tenants) {
    const found = await findTenantEmployeeByEmail(email, tenant)
    if (found) return found
  }

  // Legacy fallback for records created before per-tenant databases existed.
  const employee = await Employee.findOne({ email, deleted: false }).populate('permissions')
  if (employee) return { isSuperAdmin: false, doc: employee }

  return null
}

export function isAccountUsable(found) {
  if (found.isSuperAdmin) return found.doc.active && found.doc.status !== 'SUSPENDED'
  return found.doc.status === 'ACTIVE' || found.doc.status === 'PROBATION'
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
  const emp = found.doc
  const tenant = found.tenant || await Tenant.findById(emp.tenantId).lean()
  return {
    id: String(emp._id),
    name: emp.getFullName ? emp.getFullName() : `${emp.firstName} ${emp.lastName}`,
    email: emp.email,
    role: emp.role,
    tenantId: String(emp.tenantId),
    companyName: tenant?.companyName || null,
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
