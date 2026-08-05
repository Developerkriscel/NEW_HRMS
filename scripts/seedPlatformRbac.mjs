// Seeds the platform RBAC reference data (permission catalogue, default
// roles, role->permission grants) and backfills PLATFORM_OWNER onto any
// existing platform operator that has no role assignments yet, so accounts
// created before this system existed (e.g. the seeded admin@nexahr.io)
// keep the full access they had under the old role-only check. Safe to run
// in any environment — this is reference/migration data, not demo data —
// and safe to re-run (every write is an idempotent upsert).
//
// Mirrors lib/platformRbac.js's PLATFORM_PERMISSIONS/PLATFORM_ROLES by
// value (this script runs under plain `node`, outside Next's `@/` alias
// resolution, so it can't import that module directly — same reason
// scripts/seed.mjs re-declares its own ad-hoc schemas instead of importing
// the real models). Keep the two lists in sync if either changes.
import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config({ path: '.env.local' })
dotenv.config()

const MONGODB_URI = process.env.MONGODB_DIRECT_URI || process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('MONGODB_URI is not set. Copy .env.example to .env.local and configure it first.')
  process.exit(1)
}

const PLATFORM_PERMISSIONS = [
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

const PLATFORM_ROLES = [
  { name: 'PLATFORM_OWNER', description: 'Full, unrestricted platform access', mfaRequired: true, permissions: '*' },
  { name: 'PLATFORM_ADMIN', description: 'Day-to-day platform administration', mfaRequired: true, permissions: '*except:operator.permission.manage,platform.settings.manage' },
  { name: 'SUPPORT_ADMIN', description: 'Tenant support access and requests', mfaRequired: false, permissions: ['platform.dashboard.view', 'tenant.view', 'tenant.support_access.request', 'tenant.support_access.use', 'audit.view'] },
  { name: 'BILLING_ADMIN', description: 'Plans, subscriptions and billing', mfaRequired: false, permissions: ['platform.dashboard.view', 'tenant.view', 'plan.view', 'plan.create', 'plan.update', 'plan.archive', 'module.view', 'module.manage', 'subscription.view', 'subscription.update', 'subscription.apply_credit', 'billing.invoice.manage'] },
  { name: 'SECURITY_ADMIN', description: 'Security alerts and incidents', mfaRequired: true, permissions: ['platform.dashboard.view', 'security.alert.view', 'security.incident.manage', 'audit.view', 'audit.export'] },
  { name: 'OPERATIONS_ADMIN', description: 'Platform health, jobs and integrations', mfaRequired: false, permissions: ['platform.dashboard.view', 'platform.health.view', 'platform.job.retry', 'platform.queue.manage', 'integration.view', 'integration.manage'] },
  { name: 'COMPLIANCE_AUDITOR', description: 'Read-only audit and compliance review', mfaRequired: false, permissions: ['audit.view', 'audit.export', 'security.alert.view'] },
  { name: 'READ_ONLY_AUDITOR', description: 'Read-only platform visibility', mfaRequired: false, permissions: ['platform.dashboard.view', 'tenant.view', 'plan.view', 'module.view', 'subscription.view', 'operator.view', 'audit.view'] },
]

// Matches the module keys already used by Tenant.features / the company
// wizard's module toggles (lib/platformTenancy.js, tenants/create/page.js) —
// this seed gives that existing flat key set a real catalogue with
// descriptions and dependency relationships.
const MODULE_CATALOGUE = [
  { key: 'core_hr', name: 'Core HR', category: 'HR', description: 'Employee records, departments, designations', dependencies: [] },
  { key: 'attendance', name: 'Attendance', category: 'HR', description: 'Check-in/out and attendance tracking', dependencies: ['core_hr'] },
  { key: 'leave', name: 'Leave', category: 'HR', description: 'Leave requests, balances and approvals', dependencies: ['core_hr'] },
  { key: 'payroll', name: 'Payroll', category: 'Finance', description: 'Salary structures and payslip generation', dependencies: ['core_hr', 'attendance'] },
  { key: 'recruitment', name: 'Recruitment', category: 'HR', description: 'Candidate pipeline and hiring', dependencies: ['core_hr'] },
  { key: 'performance', name: 'Performance', category: 'HR', description: 'Reviews and performance tracking', dependencies: ['core_hr'] },
  { key: 'assets', name: 'Assets', category: 'Operations', description: 'Company asset assignment and tracking', dependencies: ['core_hr'] },
  { key: 'ai_assistant', name: 'AI Assistant', category: 'Platform', description: 'AI-assisted HR workflows', dependencies: ['core_hr'] },
]

const schemaOpts = { strict: false, timestamps: true }
const Module = mongoose.models.Module || mongoose.model('Module', new mongoose.Schema({}, schemaOpts))
const PlatformPermission = mongoose.models.PlatformPermission || mongoose.model('PlatformPermission', new mongoose.Schema({}, schemaOpts))
const PlatformRole = mongoose.models.PlatformRole || mongoose.model('PlatformRole', new mongoose.Schema({}, schemaOpts))
const PlatformRolePermission = mongoose.models.PlatformRolePermission || mongoose.model('PlatformRolePermission', new mongoose.Schema({}, schemaOpts))
const PlatformOperator = mongoose.models.PlatformOperator || mongoose.model('PlatformOperator', new mongoose.Schema({}, { ...schemaOpts, collection: 'superadminusers' }))
const PlatformOperatorRole = mongoose.models.PlatformOperatorRole || mongoose.model('PlatformOperatorRole', new mongoose.Schema({}, schemaOpts))

async function main() {
  await mongoose.connect(MONGODB_URI)
  console.log('Connected to MongoDB')

  // 1. Permission catalogue
  const keyToId = new Map()
  for (const [key, category, description] of PLATFORM_PERMISSIONS) {
    const doc = await PlatformPermission.findOneAndUpdate(
      { key },
      { $set: { category, description, deleted: false } },
      { upsert: true, new: true }
    )
    keyToId.set(key, doc._id)
  }
  console.log(`Seeded ${PLATFORM_PERMISSIONS.length} platform permissions`)

  const allKeys = PLATFORM_PERMISSIONS.map(([key]) => key)

  // 2. Roles + role->permission grants
  for (const roleDef of PLATFORM_ROLES) {
    const role = await PlatformRole.findOneAndUpdate(
      { name: roleDef.name },
      { $set: { description: roleDef.description, mfaRequired: roleDef.mfaRequired, isSystem: true, status: 'ACTIVE', deleted: false } },
      { upsert: true, new: true }
    )

    let keys
    if (roleDef.permissions === '*') {
      keys = allKeys
    } else if (typeof roleDef.permissions === 'string' && roleDef.permissions.startsWith('*except:')) {
      const excluded = new Set(roleDef.permissions.replace('*except:', '').split(','))
      keys = allKeys.filter((key) => !excluded.has(key))
    } else {
      keys = roleDef.permissions
    }

    await PlatformRolePermission.deleteMany({ role: role._id })
    for (const key of keys) {
      const permissionId = keyToId.get(key)
      if (!permissionId) continue
      await PlatformRolePermission.create({ role: role._id, permission: permissionId })
    }
  }
  console.log(`Seeded ${PLATFORM_ROLES.length} platform roles`)

  // 3. Backfill: operators with zero role assignments get PLATFORM_OWNER,
  // preserving the full access they had before granular RBAC existed.
  const ownerRole = await PlatformRole.findOne({ name: 'PLATFORM_OWNER' })
  const operators = await PlatformOperator.find({ deleted: { $ne: true } })
  let backfilled = 0
  for (const operator of operators) {
    const hasAnyRole = await PlatformOperatorRole.exists({ operator: operator._id, revoked: { $ne: true } })
    if (hasAnyRole) continue
    await PlatformOperatorRole.create({
      operator: operator._id,
      role: ownerRole._id,
      reason: 'Bootstrap migration: operator predates granular platform RBAC',
      revoked: false,
      startsAt: new Date(),
      expiresAt: null,
    })
    backfilled += 1
  }
  console.log(`Backfilled PLATFORM_OWNER role onto ${backfilled} existing operator(s) with no prior role assignment`)

  // 4. Module catalogue
  for (const mod of MODULE_CATALOGUE) {
    await Module.findOneAndUpdate(
      { key: mod.key },
      { $set: { name: mod.name, category: mod.category, description: mod.description, dependencies: mod.dependencies, status: 'ACTIVE', deleted: false } },
      { upsert: true }
    )
  }
  console.log(`Seeded ${MODULE_CATALOGUE.length} modules`)

  await mongoose.disconnect()
  console.log('Done')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
