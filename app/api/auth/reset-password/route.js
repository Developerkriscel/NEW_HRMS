export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { hashPassword, validatePasswordStrength } from '@/lib/auth'
import { findUserByEmail } from '@/lib/userLookup'
import PasswordResetToken from '@/models/PasswordResetToken'
import PlatformOperator from '@/models/PlatformOperator'
import Employee from '@/models/Employee'

export const POST = withApi(async (req) => {
  const { token, newPassword } = await req.json()
  if (!token || !newPassword) return fail('Token and new password are required', 400)

  const resetDoc = await PasswordResetToken.findOne({ token })
  if (!resetDoc) return fail('Invalid or expired reset token', 400, 'INVALID_TOKEN')

  const strength = validatePasswordStrength(newPassword)
  if (!strength.valid) return fail(strength.message, 400, 'WEAK_PASSWORD')

  const found = await findUserByEmail(resetDoc.email)
  if (!found) return fail('User not found', 404)

  const hash = await hashPassword(newPassword)
  if (found.isSuperAdmin) {
    await PlatformOperator.updateOne({ _id: found.doc._id }, { password: hash })
  } else {
    await Employee.updateOne({ _id: found.doc._id }, { password: hash })
  }

  await PasswordResetToken.deleteOne({ token })

  return ok(null, 'Password reset successfully')
})
