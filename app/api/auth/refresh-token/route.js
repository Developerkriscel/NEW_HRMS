export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { verifyJwt, generateAccessToken, generateRefreshToken, setAuthCookies, isTokenBlacklisted, isPlatformSessionRevoked, createPlatformSession, ACCESS_TOKEN_EXPIRY_MS } from '@/lib/auth'
import { findUserByEmail, isAccountUsable, toAuthUser } from '@/lib/userLookup'
import { createAccountSession, isAccountSessionRevoked, touchAccountSession } from '@/lib/accountSessions'
import { buildDevUserForEmail, isDevAuthAllowed } from '@/lib/devLogin'

function buildTokenUserInfo(authUser, found) {
  if (authUser.isSuperAdmin) {
    return {
      id: String(authUser._id),
      name: authUser.name,
      email: authUser.email,
      role: 'SUPER_ADMIN',
      tenantId: null,
      companyName: null,
      permissions: [],
      platformRoles: authUser.platformRoles || [],
      platformPermissions: authUser.platformPermissions || [],
      mfaEnabled: !!found.doc?.mfaEnabled,
    }
  }
  return {
    id: String(authUser._id),
    name: authUser.name,
    email: authUser.email,
    role: authUser.role,
    tenantId: String(authUser.tenantId),
    companyName: authUser.companyName || null,
    companySlug: authUser.companySlug || null,
    permissions: (authUser.permissions || []).map((p) => (typeof p === 'string' ? p : p.name)),
    moduleAccess: authUser.moduleAccess || [],
  }
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
  if (!decoded.devLogin && decoded.accountSessionId && await isAccountSessionRevoked(decoded.accountSessionId)) {
    return fail('Session has been revoked', 401, 'SESSION_REVOKED')
  }

  if (decoded.devLogin && isDevAuthAllowed(req)) {
    const devUser = buildDevUserForEmail(decoded.sub) || {
      id: decoded.userId,
      name: decoded.name,
      email: decoded.sub,
      role: decoded.role,
      tenantId: decoded.tenantId || null,
      companyName: decoded.companyName || null,
      companySlug: decoded.companySlug || null,
      tenantDatabaseName: decoded.tenantDatabaseName || null,
      permissions: decoded.permissions || [],
      moduleAccess: decoded.moduleAccess || [],
      platformPermissions: decoded.platformPermissions || [],
      platformRoles: decoded.platformRoles || [],
    }
    const authUser = {
      ...devUser,
      _id: devUser.id || decoded.userId,
      isSuperAdmin: devUser.role === 'SUPER_ADMIN',
      devLogin: true,
    }
    const newAccessToken = generateAccessToken(authUser)
    const newRefreshToken = generateRefreshToken(authUser)
    setAuthCookies(cookieStore, newAccessToken, newRefreshToken)
    return ok(
      {
        user: { ...devUser, devLogin: true },
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
  authUser.accountSessionId = decoded.accountSessionId || await createAccountSession(authUser, req)
  await touchAccountSession(authUser.accountSessionId)

  const newAccessToken = generateAccessToken(authUser)
  const newRefreshToken = generateRefreshToken(authUser)
  setAuthCookies(cookieStore, newAccessToken, newRefreshToken)

  const userInfo = buildTokenUserInfo(authUser, found)
  return ok({ user: userInfo, expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000) }, 'Token refreshed')
})
