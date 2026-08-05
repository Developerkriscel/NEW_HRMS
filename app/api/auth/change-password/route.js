export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, comparePassword, hashPassword, validatePasswordStrength } from '@/lib/auth'
import { findUserByEmail } from '@/lib/userLookup'
import PlatformOperator from '@/models/PlatformOperator'
import Employee from '@/models/Employee'

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  const { currentPassword, newPassword } = await req.json()
  if (!currentPassword || !newPassword) return fail('Current and new password are required', 400)

  if (session.devLogin && process.env.NODE_ENV !== 'production') {
    const strength = validatePasswordStrength(newPassword)
    if (!strength.valid) return fail(strength.message, 400, 'WEAK_PASSWORD')
    return ok(null, 'Password changed successfully in test mode')
  }

  const found = await findUserByEmail(session.sub)
  if (!found) return fail('User not found', 404)

  const match = await comparePassword(currentPassword, found.doc.password)
  if (!match) return fail('Current password is incorrect', 400, 'BAD_CREDENTIALS')

  const strength = validatePasswordStrength(newPassword)
  if (!strength.valid) return fail(strength.message, 400, 'WEAK_PASSWORD')

  const hash = await hashPassword(newPassword)
  if (found.isSuperAdmin) {
    await PlatformOperator.updateOne({ _id: found.doc._id }, { password: hash })
  } else {
    await Employee.updateOne({ _id: found.doc._id }, { password: hash })
  }

  return ok(null, 'Password changed successfully')
})
