export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { verifyJwt, generateAccessToken, generateRefreshToken, setAuthCookies, isTokenBlacklisted, isPlatformSessionRevoked, createPlatformSession, ACCESS_TOKEN_EXPIRY_MS } from '@/lib/auth'
import { findUserByEmail, isAccountUsable, buildUserInfo, toAuthUser } from '@/lib/userLookup'

const DEV_USER = {
  _id: 'dev-super-admin',
  name: 'Dev Super Admin',
  email: 'superadmin@nexahr.test',
  role: 'SUPER_ADMIN',
  isSuperAdmin: true,
  devLogin: true,
}

// Fixes a bug present in the original: the Java refresh endpoint validated
// signature/expiry only, so any still-valid access token could be replayed
// at /auth/refresh-token. Here we require the `type: 'refresh'` claim.
export const POST = withApi(async (req) => {
  const cookieStore = cookies()
  const body = await req.json().catch(() => ({}))
  const refreshToken = body.refreshToken || cookieStore.get('nexahr_refresh')?.value
  if (!refreshToken) return fail('Refresh token is required', 400)

  let decoded
  try {
    decoded = verifyJwt(refreshToken)
  } catch {
    return fail('Invalid or expired refresh token', 401, 'INVALID_TOKEN')
  }
  if (decoded.type !== 'refresh') return fail('Invalid token type', 401, 'INVALID_TOKEN')
  if (await isTokenBlacklisted(refreshToken)) return fail('Token has been revoked', 401, 'TOKEN_REVOKED')
  if (decoded.isSuperAdmin && !decoded.devLogin && decoded.sessionId && await isPlatformSessionRevoked(decoded.sessionId)) {
    return fail('Session has been revoked', 401, 'SESSION_REVOKED')
  }

  if (decoded.devLogin && process.env.NODE_ENV !== 'production') {
    const newAccessToken = generateAccessToken(DEV_USER)
    const newRefreshToken = generateRefreshToken(DEV_USER)
    setAuthCookies(cookieStore, newAccessToken, newRefreshToken)
    return ok(
      {
        user: {
          _id: DEV_USER._id,
          name: DEV_USER.name,
          email: DEV_USER.email,
          role: DEV_USER.role,
          isSuperAdmin: true,
          tenantId: null,
          permissions: [],
          devLogin: true,
        },
        expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000),
      },
      'Token refreshed'
    )
  }

  const found = await findUserByEmail(decoded.sub, { tenantId: decoded.tenantId })
  if (!found || !isAccountUsable(found)) return fail('Account is no longer active', 401, 'ACCOUNT_DISABLED')

  const authUser = await toAuthUser(found)
  if (authUser.isSuperAdmin) {
    // Reuse the existing session if this token already carried one (keeps
    // it revocable under the same id); legacy tokens without one get a
    // fresh session record instead of silently running unsession-tracked.
    authUser.sessionId = decoded.sessionId || await createPlatformSession(authUser._id, req)
  }

  const newAccessToken = generateAccessToken(authUser)
  const newRefreshToken = generateRefreshToken(authUser)
  setAuthCookies(cookieStore, newAccessToken, newRefreshToken)

  const userInfo = await buildUserInfo(found)
  return ok({ user: userInfo, expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000) }, 'Token refreshed')
})
