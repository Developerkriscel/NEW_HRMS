export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import Tenant from '@/models/Tenant'

// Bridges a tenant-side session to its own Tenant document, which lives in
// the platform database (Tenant has no tenantId field, so it's never
// tenant-scoped/proxied — see models/_base.js). Deliberately excludes
// tenantCode/subdomain/status/limits/plan: those stay platform-controlled,
// the same boundary super admin's tenant primary-admin route enforces in
// the other direction.
const PROFILE_FIELDS = ['companyName', 'phone', 'logoUrl', 'address', 'city', 'state', 'country', 'gstNumber', 'panNumber', 'industryType']

export const GET = withApi(async () => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)

  const tenant = await Tenant.findById(tenantId).select([...PROFILE_FIELDS, 'hrSettings', 'features', 'timezone', 'currency'].join(' '))
  if (!tenant) return fail('Company profile not found', 404)
  return ok(tenant)
})

export const PUT = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['COMPANY_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const tenant = await Tenant.findById(tenantId)
  if (!tenant) return fail('Company profile not found', 404)

  for (const field of PROFILE_FIELDS) {
    if (body[field] !== undefined) tenant[field] = body[field]
  }
  if (body.hrSettings) {
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
