export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { comparePassword, generateAccessToken, generateRefreshToken, setAuthCookies, createPlatformSession, ACCESS_TOKEN_EXPIRY_MS } from '@/lib/auth'
import { findUserByEmail, isAccountUsable, buildUserInfo, toAuthUser } from '@/lib/userLookup'
import PlatformOperator from '@/models/PlatformOperator'
import { createAccountSession } from '@/lib/accountSessions'

// twoFactorCode is accepted for shape-compatibility with the old
// LoginRequest DTO but, matching the original backend, is never validated —
// 2FA was never actually implemented server-side.
export const POST = withApi(async (req) => {
  const { email, password } = await req.json()
  if (!email || !password) return fail('Email and password are required', 400)

  const found = await findUserByEmail(email)
  if (!found) return fail('Invalid email or password', 401, 'BAD_CREDENTIALS')

  const match = await comparePassword(password, found.doc.password)
  if (!match) return fail('Invalid email or password', 401, 'BAD_CREDENTIALS')

  if (!isAccountUsable(found)) {
    return fail('Your account is disabled. Contact your administrator.', 403, 'ACCOUNT_DISABLED')
  }

  const authUser = await toAuthUser(found)

  if (authUser.isSuperAdmin) {
    authUser.sessionId = await createPlatformSession(authUser._id, req)
    await PlatformOperator.updateOne({ _id: authUser._id }, { lastLoginAt: new Date(), lastLoginIp: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null })
  }
  authUser.accountSessionId = await createAccountSession(authUser, req)

  const accessToken = generateAccessToken(authUser)
  const refreshToken = generateRefreshToken(authUser)
  setAuthCookies(cookies(), accessToken, refreshToken)

  const userInfo = await buildUserInfo(found)
  return ok({ user: userInfo, expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000) }, 'Login successful')
})
