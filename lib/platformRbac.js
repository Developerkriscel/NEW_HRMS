import PlatformOperatorRole from '@/models/PlatformOperatorRole'
import PlatformRolePermission from '@/models/PlatformRolePermission'
import PlatformPermission from '@/models/PlatformPermission'
import PlatformRole from '@/models/PlatformRole'
import { ApiError } from '@/lib/auth'

const RBAC_CACHE_TTL_MS = Number(process.env.PLATFORM_RBAC_CACHE_TTL_MS || 10000)
const permissionCache = global.__nexahrPlatformPermissionCache || new Map()
if (!global.__nexahrPlatformPermissionCache) global.__nexahrPlatformPermissionCache = permissionCache

// Full permission catalogue. Seeded into PlatformPermission by
// scripts/seedPlatformRbac.mjs — kept here as the single source of truth so
// route handlers and the seed script can never drift apart.
export const PLATFORM_PERMISSIONS = [
  ['platform.dashboard.view', 'platform', 'View the platform dashboard'],
  ['tenant.view', 'tenant', 'View tenant/company records'],
  ['tenant.create', 'tenant', 'Create new tenants'],
  ['tenant.update', 'tenant', 'Edit tenant details'],
  ['tenant.activate', 'tenant', 'Reactivate a tenant'],
  ['tenant.suspend', 'tenant', 'Suspend a tenant'],
  ['tenant.archive', 'tenant', 'Archive a tenant'],
  ['tenant.schedule_purge', 'tenant', 'Schedule a tenant for purge'],
  ['tenant.cancel_purge', 'tenant', 'Cancel a scheduled purge'],
  ['tenant.export_metadata', 'tenant', 'Export tenant metadata'],
  ['tenant.support_access.request', 'support', 'Request a support access session'],
  ['tenant.support_access.approve', 'support', 'Approve a support access session'],
  ['tenant.support_access.use', 'support', 'Use an approved support access session'],
  ['plan.view', 'plan', 'View plans'],
  ['plan.create', 'plan', 'Create plans'],
  ['plan.update', 'plan', 'Edit plans'],
  ['plan.archive', 'plan', 'Archive plans'],
  ['module.view', 'plan', 'View the global module catalogue'],
  ['module.manage', 'plan', 'Create and edit modules in the catalogue'],
  ['subscription.view', 'subscription', 'View subscriptions'],
  ['subscription.update', 'subscription', 'Edit subscriptions'],
  ['subscription.apply_credit', 'subscription', 'Apply subscription credits'],
  ['billing.invoice.manage', 'subscription', 'Record invoices and payments'],
  ['operator.view', 'operator', 'View platform operators'],
  ['operator.create', 'operator', 'Create platform operators'],
  ['operator.update', 'operator', 'Edit platform operators'],
  ['operator.suspend', 'operator', 'Suspend platform operators'],
  ['operator.permission.manage', 'operator', 'Manage operator roles and permissions'],
  ['platform.health.view', 'operations', 'View platform health'],
  ['platform.job.retry', 'operations', 'Retry background jobs'],
  ['platform.queue.manage', 'operations', 'Pause/resume job queues'],
  ['security.alert.view', 'security', 'View security alerts'],
  ['security.incident.manage', 'security', 'Manage security incidents'],
  ['audit.view', 'audit', 'View audit logs'],
  ['audit.export', 'audit', 'Export audit logs'],
  ['feature_flag.view', 'config', 'View feature flags'],
  ['feature_flag.manage', 'config', 'Manage feature flags'],
  ['integration.view', 'integration', 'View integrations'],
  ['integration.manage', 'integration', 'Manage integrations'],
  ['platform.settings.manage', 'platform', 'Manage platform settings'],
]

// Suggested default roles and the permission categories/keys they get.
// PLATFORM_OWNER always gets every permission regardless of this list.
export const PLATFORM_ROLES = [
  { name: 'PLATFORM_OWNER', description: 'Full, unrestricted platform access', mfaRequired: true, permissions: '*' },
  { name: 'PLATFORM_ADMIN', description: 'Day-to-day platform administration', mfaRequired: true, permissions: '*except:operator.permission.manage,platform.settings.manage' },
  { name: 'SUPPORT_ADMIN', description: 'Tenant support access and requests', mfaRequired: false, permissions: ['platform.dashboard.view', 'tenant.view', 'tenant.support_access.request', 'tenant.support_access.use', 'audit.view'] },
  { name: 'BILLING_ADMIN', description: 'Plans, subscriptions and billing', mfaRequired: false, permissions: ['platform.dashboard.view', 'tenant.view', 'plan.view', 'plan.create', 'plan.update', 'plan.archive', 'module.view', 'module.manage', 'subscription.view', 'subscription.update', 'subscription.apply_credit', 'billing.invoice.manage'] },
  { name: 'SECURITY_ADMIN', description: 'Security alerts and incidents', mfaRequired: true, permissions: ['platform.dashboard.view', 'security.alert.view', 'security.incident.manage', 'audit.view', 'audit.export'] },
  { name: 'OPERATIONS_ADMIN', description: 'Platform health, jobs and integrations', mfaRequired: false, permissions: ['platform.dashboard.view', 'platform.health.view', 'platform.job.retry', 'platform.queue.manage', 'integration.view', 'integration.manage'] },
  { name: 'COMPLIANCE_AUDITOR', description: 'Read-only audit and compliance review', mfaRequired: false, permissions: ['audit.view', 'audit.export', 'security.alert.view'] },
  { name: 'READ_ONLY_AUDITOR', description: 'Read-only platform visibility', mfaRequired: false, permissions: ['platform.dashboard.view', 'tenant.view', 'plan.view', 'module.view', 'subscription.view', 'operator.view', 'audit.view'] },
]

// Resolves the effective, deduplicated set of permission keys for an
// operator from their non-revoked, non-expired role assignments. Used both
// at login (to embed permissions in the JWT) and by admin UI (to show an
// operator's effective grants).
export async function resolveOperatorPermissions(operatorId) {
  const cacheKey = String(operatorId)
  const cached = permissionCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const assignments = await PlatformOperatorRole.find({ operator: operatorId, revoked: false }).populate('role')
  const now = new Date()
  const activeRoleIds = assignments
    .filter((a) => a.isEffective(now) && a.role && a.role.status === 'ACTIVE')
    .map((a) => a.role._id)

  if (activeRoleIds.length === 0) {
    const empty = { roles: [], permissions: [] }
    permissionCache.set(cacheKey, { expiresAt: Date.now() + RBAC_CACHE_TTL_MS, value: empty })
    return empty
  }

  const rolePermissions = await PlatformRolePermission.find({ role: { $in: activeRoleIds } }).populate('permission')
  const permissionKeys = Array.from(new Set(rolePermissions.map((rp) => rp.permission?.key).filter(Boolean)))
  const roleNames = Array.from(new Set(assignments.filter((a) => activeRoleIds.some((id) => String(id) === String(a.role._id))).map((a) => a.role.name)))

  const resolved = { roles: roleNames, permissions: permissionKeys }
  permissionCache.set(cacheKey, { expiresAt: Date.now() + RBAC_CACHE_TTL_MS, value: resolved })
  return resolved
}

export function hasPlatformPermission(session, key) {
  if (!session?.isSuperAdmin) return false
  if (session.devLogin) return true // dev-only, DB-less super admin — full access by design
  const perms = session.platformPermissions || []
  return perms.includes('*') || perms.includes(key)
}

export function requirePlatformPermission(session, key) {
  if (!hasPlatformPermission(session, key)) {
    throw new ApiError(403, 'You do not have permission to perform this action', 'FORBIDDEN')
  }
}

export async function seedOwnerRoleForOperator(operatorId, { assignedBy = null, reason = 'Bootstrap: operator had no role assignments' } = {}) {
  const ownerRole = await PlatformRole.findOne({ name: 'PLATFORM_OWNER' })
  if (!ownerRole) return null
  return PlatformOperatorRole.create({ operator: operatorId, role: ownerRole._id, assignedBy, reason })
}

// Counts operators with a currently-effective PLATFORM_OWNER assignment,
// on an ACTIVE (non-suspended) operator account. Used to block the last
// remaining owner from being revoked or suspended — losing every owner
// would leave nobody able to grant operator.permission.manage back.
export async function countActiveOwners({ excludingAssignmentId = null, excludingOperatorId = null } = {}) {
  const PlatformOperator = (await import('@/models/PlatformOperator')).default
  const ownerRole = await PlatformRole.findOne({ name: 'PLATFORM_OWNER' })
  if (!ownerRole) return 0

  const query = { role: ownerRole._id, revoked: false }
  if (excludingAssignmentId) query._id = { $ne: excludingAssignmentId }
  if (excludingOperatorId) query.operator = { $ne: excludingOperatorId }
  const assignments = await PlatformOperatorRole.find(query)

  const now = new Date()
  let count = 0
  for (const assignment of assignments) {
    if (!assignment.isEffective(now)) continue
    const operator = await PlatformOperator.findById(assignment.operator).select('status')
    if (operator?.status === 'ACTIVE') count += 1
  }
  return count
}

export async function assertNotLastActiveOwner({ excludingAssignmentId, excludingOperatorId, roleId } = {}) {
  if (roleId) {
    const ownerRole = await PlatformRole.findOne({ name: 'PLATFORM_OWNER' })
    if (!ownerRole || String(ownerRole._id) !== String(roleId)) return
  }
  const remaining = await countActiveOwners({ excludingAssignmentId, excludingOperatorId })
  if (remaining < 1) {
    throw new ApiError(400, 'This would leave the platform with no active PLATFORM_OWNER — assign another owner first', 'LAST_OWNER_PROTECTED')
  }
}
