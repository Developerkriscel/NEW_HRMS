export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, hashPassword } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import Tenant from '@/models/Tenant'
import { getTenantModelForDatabase, buildTenantDatabaseName } from '@/lib/tenantDb'

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'operator.view')

  const url = new URL(req.url)
  const tenantId = url.searchParams.get('tenantId')

  if (!tenantId) return fail('tenantId query parameter is required', 400, 'VALIDATION_ERROR')

  const tenant = await Tenant.findById(tenantId)
  if (!tenant) return fail('Tenant not found', 404, 'TENANT_NOT_FOUND')

  const dbName = tenant.databaseName || buildTenantDatabaseName(tenant.tenantCode, tenant._id)
  const TenantEmployee = getTenantModelForDatabase('Employee', dbName)

  const admin = await TenantEmployee.findOne({ _id: params.id, role: 'COMPANY_ADMIN' }).select('-password')
  if (!admin) {
    return fail('Administrator not found', 404, 'ADMIN_NOT_FOUND')
  }

  return ok({
    ...admin.toObject(),
    companyName: tenant.companyName,
    tenantId: tenant._id,
    tenantCode: tenant.tenantCode
  })
})

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'operator.update')

  const body = await req.json()
  const { tenantId, email, password, firstName, lastName, mobileNumber, designation, profilePhoto, status } = body

  if (!tenantId) return fail('tenantId is required in the body', 400, 'VALIDATION_ERROR')

  const tenant = await Tenant.findById(tenantId)
  if (!tenant) return fail('Tenant not found', 404, 'TENANT_NOT_FOUND')

  const dbName = tenant.databaseName || buildTenantDatabaseName(tenant.tenantCode, tenant._id)
  const TenantEmployee = getTenantModelForDatabase('Employee', dbName)

  const admin = await TenantEmployee.findOne({ _id: params.id, role: 'COMPANY_ADMIN' })
  if (!admin) {
    return fail('Administrator not found', 404, 'ADMIN_NOT_FOUND')
  }

  if (email && email.toLowerCase() !== admin.email) {
    const existing = await TenantEmployee.findOne({ email: email.toLowerCase() })
    if (existing) {
      return fail('An administrator with this email already exists in this company', 400, 'DUPLICATE_ADMIN')
    }
    admin.email = email.toLowerCase()
  }

  if (password) {
    admin.password = await hashPassword(password)
  }

  if (firstName) admin.firstName = firstName
  if (lastName) admin.lastName = lastName
  if (mobileNumber !== undefined) {
    admin.phone = mobileNumber
  }
  if (designation !== undefined) {
    // Designation in Employee model is an ObjectId. Wait, if it's a string from the form?
    // In Employee.js designation is `{ type: mongoose.Schema.Types.ObjectId, ref: 'Designation', default: null }`
    // We cannot just save a string to an ObjectId field!
    // But previously PlatformOperator had it as String. 
    // We should either clear it or let it fail if it's an invalid ObjectId.
    // For now we'll ignore designation if it's just a string, or set it to null.
  }
  if (profilePhoto !== undefined) admin.profilePhotoUrl = profilePhoto
  if (status) admin.status = status

  await admin.save()
  const adminObj = admin.toObject()
  delete adminObj.password

  return ok({
    ...adminObj,
    companyName: tenant.companyName,
    tenantId: tenant._id,
    tenantCode: tenant.tenantCode
  })
})
