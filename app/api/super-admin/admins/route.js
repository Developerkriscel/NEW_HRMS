export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, hashPassword } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import Tenant from '@/models/Tenant'
import { getTenantModelForDatabase, buildTenantDatabaseName } from '@/lib/tenantDb'
import { rememberLoginDirectoryEntry } from '@/lib/loginDirectory'

function primaryAdminFallback(tenant) {
  if (!tenant.adminEmail) return null
  const emailName = String(tenant.adminEmail).split('@')[0] || 'Primary'
  return {
    _id: `tenant-primary-${tenant._id}`,
    virtual: true,
    source: 'TENANT_PRIMARY_ADMIN',
    firstName: emailName,
    lastName: 'Admin',
    name: `${emailName} Admin`,
    email: tenant.adminEmail,
    phone: '',
    mobileNumber: '',
    role: 'COMPANY_ADMIN',
    status: tenant.status === 'SUSPENDED' ? 'INACTIVE' : 'ACTIVE',
    mfaEnabled: false,
    companyName: tenant.companyName,
    tenantId: tenant._id,
    tenantCode: tenant.tenantCode,
    tenantDatabaseMissingAdmin: true,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
  }
}

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'operator.view')

  const tenants = await Tenant.find({ deleted: false }).select('companyName tenantCode databaseName adminEmail status createdAt updatedAt _id').lean()
  const adminLists = await Promise.all(
    tenants.map(async (tenant) => {
      try {
        const dbName = tenant.databaseName || buildTenantDatabaseName(tenant.tenantCode, tenant._id)
        const TenantEmployee = getTenantModelForDatabase('Employee', dbName)
        const query = {
          deleted: false,
          $or: [
            { role: 'COMPANY_ADMIN' },
            ...(tenant.adminEmail ? [{ email: String(tenant.adminEmail).toLowerCase() }] : []),
          ],
        }
        const admins = await TenantEmployee.find(query)
          .select('-password -__v')
          .lean()
        const rows = admins.map((admin) => ({
          ...admin,
          companyName: tenant.companyName,
          tenantId: tenant._id,
          tenantCode: tenant.tenantCode
        }))
        const hasPrimary = tenant.adminEmail && rows.some((admin) => String(admin.email).toLowerCase() === String(tenant.adminEmail).toLowerCase())
        const fallback = hasPrimary ? null : primaryAdminFallback(tenant)
        return fallback ? [fallback, ...rows] : rows
      } catch (e) {
        console.error('Error fetching admins for tenant', tenant.tenantCode, e)
        const fallback = primaryAdminFallback(tenant)
        return fallback ? [fallback] : []
      }
    })
  )

  const allAdmins = adminLists.flat().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return ok(allAdmins)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'operator.create')

  const body = await req.json()
  const { tenantId, email, password, firstName, lastName, mobileNumber, designation, profilePhoto, status } = body

  if (!tenantId || !email || !password || !firstName || !lastName) {
    return fail('Tenant, email, password, first name, and last name are required', 400, 'VALIDATION_ERROR')
  }

  const tenant = await Tenant.findById(tenantId)
  if (!tenant) return fail('Tenant not found', 404, 'TENANT_NOT_FOUND')

  const dbName = tenant.databaseName || buildTenantDatabaseName(tenant.tenantCode, tenant._id)
  const TenantEmployee = getTenantModelForDatabase('Employee', dbName)

  const existing = await TenantEmployee.findOne({ email: email.toLowerCase() })
  if (existing) {
    return fail('An administrator with this email already exists in this company', 400, 'DUPLICATE_ADMIN')
  }

  const hashedPassword = await hashPassword(password)
  const computedName = `${firstName} ${lastName}`

  const admin = await TenantEmployee.create({
    email: email.toLowerCase(),
    password: hashedPassword,
    firstName,
    lastName,
    name: computedName, // Note: Employee schema doesn't have name, it has firstName/lastName, but we'll add it if they expect it or just let it ignore. Wait, Employee schema doesn't have `name`.
    mobileNumber,
    phone: mobileNumber,
    designation,
    profilePhotoUrl: profilePhoto,
    status: status || 'ACTIVE',
    role: 'COMPANY_ADMIN',
    tenantId: tenant._id,
  })
  await rememberLoginDirectoryEntry({ isSuperAdmin: false, doc: admin, tenant, databaseName: dbName })

  const adminObj = admin.toObject()
  delete adminObj.password
  
  return ok({
    ...adminObj,
    companyName: tenant.companyName,
    tenantId: tenant._id,
    tenantCode: tenant.tenantCode
  })
})
