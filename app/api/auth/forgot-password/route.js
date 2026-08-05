export const dynamic = 'force-dynamic'

import crypto from 'crypto'
import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { findUserByEmail } from '@/lib/userLookup'
import PasswordResetToken from '@/models/PasswordResetToken'

const ONE_HOUR_MS = 60 * 60 * 1000

export const POST = withApi(async (req) => {
  const { email } = await req.json()

  // Silently no-op if the email doesn't exist, to avoid leaking which
  // addresses are registered — same behavior as the original.
  const found = email ? await findUserByEmail(email) : null
  if (found) {
    const token = crypto.randomUUID()
    await PasswordResetToken.create({ token, email, expiresAt: new Date(Date.now() + ONE_HOUR_MS) })
    // Email sending is unimplemented, exactly as in the original backend
    // (mail config existed but no EmailService was ever wired up) — the
    // token is only logged here for local/dev use.
    console.log(`[password reset] token for ${email}: ${token}`)
  }

  return ok(null, 'If an account with that email exists, a reset link has been sent.')
})
