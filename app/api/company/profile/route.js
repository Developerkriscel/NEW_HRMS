export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Tenant from '@/models/Tenant'
import Employee from '@/models/Employee'

// Bridges a tenant-side session to its own Tenant document, which lives in
// the platform database (Tenant has no tenantId field, so it's never
// tenant-scoped/proxied — see models/_base.js). Deliberately excludes
// tenantCode/subdomain/status/limits/plan: those stay platform-controlled,
// the same boundary super admin's tenant primary-admin route enforces in
// the other direction.
const PROFILE_FIELDS = ['companyName', 'phone', 'logoUrl', 'address', 'city', 'state', 'country', 'gstNumber', 'panNumber', 'industryType']

async function resolveTenant(session, tenantId) {
  // Older tenant documents may not have the newer `deleted: false` field.
  // Read by id first, then enforce soft-delete explicitly.
  let tenant = await Tenant.findById(tenantId)
  if (tenant?.deleted) tenant = null
  if (tenant || !session?.userId) return tenant

  // Recover from an old/stale access token whose tenant claim no longer
  // matches the employee directory. This keeps settings available without
  // weakening tenant isolation because the fallback still comes from the
  // authenticated employee record.
  const employee = await Employee.findOne({
    _id: session.userId,
    $or: [{ deleted: false }, { deleted: { $exists: false } }],
  }).select('tenantId').lean()
  if (employee?.tenantId && String(employee.tenantId) !== String(tenantId)) {
    tenant = await Tenant.findById(employee.tenantId)
    if (tenant?.deleted) tenant = null
  }
  if (tenant) return tenant

  // Dev/legacy tokens can have a stale tenant id while still carrying the
  // authoritative tenant database name or login email. Resolve only through
  // values belonging to the authenticated session; never fall back to an
  // arbitrary tenant record.
  const identityQueries = []
  if (session?.tenantDatabaseName) identityQueries.push({ databaseName: session.tenantDatabaseName })
  if (session?.sub) identityQueries.push({ adminEmail: String(session.sub).toLowerCase() })
  if (session?.sub) identityQueries.push({ email: String(session.sub).toLowerCase() })
  if (identityQueries.length) {
    tenant = await Tenant.findOne({ $or: identityQueries, deleted: { $ne: true } })
  }
  return tenant
}

export const GET = withApi(async () => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)

  const tenant = await resolveTenant(session, tenantId)
  if (!tenant) return fail('Company profile not found', 404)
  return ok(await Tenant.findById(tenant._id).select([...PROFILE_FIELDS, 'hrSettings', 'features', 'timezone', 'currency'].join(' ')))
})

export const PUT = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const tenant = await resolveTenant(session, tenantId)
  if (!tenant) return fail('Company profile not found', 404)

  const hasProfileUpdate = PROFILE_FIELDS.some((field) => body[field] !== undefined)
  const hasHrSettingsUpdate = body.hrSettings !== undefined

  if (hasProfileUpdate && !['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) {
    return fail('Only company admins can update company profile fields', 403)
  }

  for (const field of PROFILE_FIELDS) {
    if (body[field] !== undefined) tenant[field] = body[field]
  }
  if (hasHrSettingsUpdate) {
    if (body.hrSettings.employeeIdPrefix !== undefined) tenant.hrSettings.employeeIdPrefix = body.hrSettings.employeeIdPrefix
    if (body.hrSettings.officeStartTime !== undefined) tenant.hrSettings.officeStartTime = body.hrSettings.officeStartTime
    if (body.hrSettings.officeEndTime !== undefined) tenant.hrSettings.officeEndTime = body.hrSettings.officeEndTime
    if (Array.isArray(body.hrSettings.workingDays)) tenant.hrSettings.workingDays = body.hrSettings.workingDays
    if (Array.isArray(body.hrSettings.weeklyOff)) tenant.hrSettings.weeklyOff = body.hrSettings.weeklyOff
  }

  tenant.updatedBy = session.sub
  await tenant.save()

  await logAction(session, {
    action: 'COMPANY_PROFILE_UPDATED',
    entityType: 'Tenant',
    entityId: tenant._id,
    description: 'Company profile updated',
  })

  return ok(tenant, 'Company profile updated')
})
