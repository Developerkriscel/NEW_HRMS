export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, hashPassword } from '@/lib/auth'
import { requirePlatformPermission, assertNotLastActiveOwner } from '@/lib/platformRbac'
import PlatformOperator from '@/models/PlatformOperator'

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'operator.view')

  if (session.devLogin && process.env.NODE_ENV !== 'production' && params.id === 'dev-1') {
    return ok({ _id: 'dev-1', name: global._mockDevName || 'Dev Admin', email: 'dev@nexahr.com', status: global._mockDevStatus || 'ACTIVE', mfaEnabled: false, createdAt: new Date() })
  }

  const operator = await PlatformOperator.findById(params.id)
    .select('-password -mfaSecret')
    .lean()

  if (!operator) {
    throw new Error('Admin not found')
  }

  return ok(operator)
})

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'operator.update')

  const { name, firstName, lastName, mobileNumber, designation, profilePhoto, status, password } = await req.json()

  // Compute name if firstName/lastName provided, else use provided name
  let computedName = name
  if (firstName && lastName) {
    computedName = `${firstName} ${lastName}`
  } else if (firstName) {
    computedName = firstName
  }

  if (session.devLogin && process.env.NODE_ENV !== 'production' && params.id === 'dev-1') {
    global._mockDevStatus = status;
    global._mockDevName = computedName;
    return ok({ _id: 'dev-1', name: computedName || 'Dev Admin', firstName, lastName, mobileNumber, designation, profilePhoto, email: 'dev@nexahr.com', status: status || 'ACTIVE', mfaEnabled: false, createdAt: new Date() })
  }

  const operator = await PlatformOperator.findById(params.id)
  if (!operator) {
    throw new Error('Admin not found')
  }

  if (status === 'SUSPENDED' && operator.status !== 'SUSPENDED') {
    requirePlatformPermission(session, 'operator.suspend')
    // Ensure we don't suspend the last active PLATFORM_OWNER
    await assertNotLastActiveOwner({ excludingOperatorId: operator._id })
  }

  if (computedName) operator.name = computedName
  if (firstName !== undefined) operator.firstName = firstName
  if (lastName !== undefined) operator.lastName = lastName
  if (mobileNumber !== undefined) operator.mobileNumber = mobileNumber
  if (designation !== undefined) operator.designation = designation
  if (profilePhoto !== undefined) operator.profilePhoto = profilePhoto

  if (password) {
    operator.password = await hashPassword(password)
  }

  if (status && ['ACTIVE', 'SUSPENDED'].includes(status)) {
    operator.status = status
    operator.active = (status === 'ACTIVE') // keep the boolean in sync
  }

  await operator.save()

  return ok(operator)
})
