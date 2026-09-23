export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, hashPassword } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import PlatformOperator from '@/models/PlatformOperator'
import { devSuperAdminStore } from '@/lib/devSuperAdminStore'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'operator.view')

  if (session.devLogin && process.env.NODE_ENV !== 'production') {
    // Return a mocked dev admin if using dev mode without a DB
    return ok([{ _id: 'dev-1', name: global._mockDevName || 'Dev Admin', email: 'dev@nexahr.com', status: global._mockDevStatus || 'ACTIVE', mfaEnabled: false, createdAt: new Date() }])
  }

  const operators = await PlatformOperator.find()
    .select('-password -mfaSecret')
    .sort({ createdAt: -1 })
    .lean()

  return ok(operators)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'operator.update') // using update or a generic platform admin role

  const body = await req.json()
  const { email, password, firstName, lastName, mobileNumber, designation, profilePhoto, status } = body

  if (!email || !password || !firstName || !lastName) {
    throw new Error('Email, password, first name, and last name are required')
  }

  const existing = await PlatformOperator.findOne({ email: email.toLowerCase() })
  if (existing) {
    throw new Error('An administrator with this email already exists')
  }

  const hashedPassword = await hashPassword(password)
  const computedName = `${firstName} ${lastName}`

  const operator = await PlatformOperator.create({
    email: email.toLowerCase(),
    password: hashedPassword,
    name: computedName,
    firstName,
    lastName,
    mobileNumber,
    designation,
    profilePhoto,
    status: status || 'ACTIVE',
    active: status === 'ACTIVE'
  })

  const operatorObj = operator.toObject()
  delete operatorObj.password
  
  return ok(operatorObj)
})
