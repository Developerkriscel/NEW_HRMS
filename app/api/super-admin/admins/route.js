export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, hashPassword } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import Tenant from '@/models/Tenant'
import { getTenantModelForDatabase, buildTenantDatabaseName } from '@/lib/tenantDb'
import { rememberLoginDirectoryEntry } from '@/lib/loginDirectory'
import mongoose from 'mongoose'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'operator.view')

  if (session.devLogin && process.env.NODE_ENV !== 'production') {
    // For local dev, maybe mock some admins if tenants exist, or just return an empty array if no real DB
    // Or just fetch from actual tenants since dev uses local mongo now
  }

  const tenants = await Tenant.find({ deleted: false }).lean()
  const allAdmins = []

  for (const tenant of tenants) {
    try {
      const dbName = tenant.databaseName || buildTenantDatabaseName(tenant.tenantCode, tenant._id)
      const TenantEmployee = getTenantModelForDatabase('Employee', dbName)

      const admins = await TenantEmployee.find({ role: 'COMPANY_ADMIN' })
        .select('-password -__v')
        .lean()

      for (const admin of admins) {
        allAdmins.push({
          ...admin,
          companyName: tenant.companyName,
          tenantId: tenant._id,
          tenantCode: tenant.tenantCode
        })
      }
    } catch (e) {
      console.error('Error fetching admins for tenant', tenant.tenantCode, e)
    }
  }

  allAdmins.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return ok(allAdmins)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'operator.update')

  const body = await req.json()
  const { tenantId, email, password, firstName, lastName, mobileNumber, designation, profilePhoto, status } = body

  if (!tenantId || !email || !password || !firstName || !lastName) {
    throw new Error('Tenant, Email, password, first name, and last name are required')
  }

  const tenant = await Tenant.findById(tenantId)
  if (!tenant) throw new Error('Tenant not found')

  const dbName = tenant.databaseName || buildTenantDatabaseName(tenant.tenantCode, tenant._id)
  const TenantEmployee = getTenantModelForDatabase('Employee', dbName)

  const existing = await TenantEmployee.findOne({ email: email.toLowerCase() })
  if (existing) {
    throw new Error('An administrator with this email already exists in this company')
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
