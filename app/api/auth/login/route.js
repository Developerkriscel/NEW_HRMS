export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { comparePassword, generateAccessToken, generateRefreshToken, setAuthCookies, createPlatformSession, ACCESS_TOKEN_EXPIRY_MS } from '@/lib/auth'
import { connectDB } from '@/lib/db'
import { buildDevUserForEmail, isDevQuickCredential } from '@/lib/devLogin'
import { findUserByEmail, isAccountUsable, toAuthUser } from '@/lib/userLookup'
import PlatformOperator from '@/models/PlatformOperator'
import { createAccountSession } from '@/lib/accountSessions'

const LOGIN_SLOW_LOG_MS = Number(process.env.AUTH_LOGIN_SLOW_LOG_MS || 1200)

function isDatabaseConnectivityError(err) {
  const names = new Set([
    'MongoServerSelectionError',
    'MongooseServerSelectionError',
    'MongoNetworkError',
    'MongoNetworkTimeoutError',
    'MongoTimeoutError',
  ])
  const codes = new Set(['ETIMEDOUT', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'EAI_AGAIN'])
  for (let error = err, depth = 0; error && depth < 6; error = error.cause, depth++) {
    if (names.has(error.name) || codes.has(error.code)) return true
  }
  return false
}

function issueDevLogin(email) {
  const devUser = buildDevUserForEmail(email)
  const authUser = {
    ...devUser,
    _id: devUser.id,
    isSuperAdmin: devUser.role === 'SUPER_ADMIN',
    devLogin: true,
  }
  const accessToken = generateAccessToken(authUser)
  const refreshToken = generateRefreshToken(authUser)
  setAuthCookies(cookies(), accessToken, refreshToken)
  return ok({ user: { ...devUser, devLogin: true }, expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000) }, 'Dev login successful')
}

function buildLoginUserInfo(authUser, found) {
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

// twoFactorCode is accepted for shape-compatibility with the old
// LoginRequest DTO but, matching the original backend, is never validated —
// 2FA was never actually implemented server-side.
export const POST = withApi(async (req) => {
  const timings = []
  const startedAt = Date.now()
  let phaseStartedAt = startedAt
  const mark = (name) => {
    const now = Date.now()
    timings.push(`${name}:${now - phaseStartedAt}ms`)
    phaseStartedAt = now
  }

  const { email, password } = await req.json()
  mark('parse')
  if (!email || !password) return fail('Email and password are required', 400)

  if (isDevQuickCredential(email, password, req) && process.env.NEXAHR_QUICK_LOGIN_USES_DB !== 'true') {
    return issueDevLogin(email)
  }

  let found
  try {
    await connectDB()
    mark('db')
    found = await findUserByEmail(email)
    mark('lookup')
  } catch (err) {
    if (isDevQuickCredential(email, password, req) && isDatabaseConnectivityError(err)) {
      return issueDevLogin(email)
    }
    throw err
  }

  if (!found) return fail('Invalid email or password', 401, 'BAD_CREDENTIALS')

  const match = await comparePassword(password, found.doc.password)
  mark('password')
  if (!match) return fail('Invalid email or password', 401, 'BAD_CREDENTIALS')

  if (!isAccountUsable(found)) {
    return fail('Your account is disabled. Contact your administrator.', 403, 'ACCOUNT_DISABLED')
  }

  const authUser = await toAuthUser(found)
  mark('user')

  if (authUser.isSuperAdmin) {
    const [platformSessionId, accountSessionId] = await Promise.all([
      createPlatformSession(authUser._id, req),
      createAccountSession(authUser, req),
      PlatformOperator.updateOne({ _id: authUser._id }, { lastLoginAt: new Date(), lastLoginIp: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null }),
    ])
    authUser.sessionId = platformSessionId
    authUser.accountSessionId = accountSessionId
  } else {
    authUser.accountSessionId = await createAccountSession(authUser, req)
  }
  mark('session')

  const accessToken = generateAccessToken(authUser)
  const refreshToken = generateRefreshToken(authUser)
  setAuthCookies(cookies(), accessToken, refreshToken)
  mark('token')

  const elapsedMs = Date.now() - startedAt
  timings.push(`total:${elapsedMs}ms`)
  if (elapsedMs >= LOGIN_SLOW_LOG_MS) {
    console.warn(`[auth:login:slow] ${String(email).toLowerCase()} ${elapsedMs}ms ${timings.join(' ')}`)
  }
  const userInfo = buildLoginUserInfo(authUser, found)
  const response = ok({ user: userInfo, expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000) }, 'Login successful')
  if (process.env.NODE_ENV !== 'production') {
    response.headers.set('X-Auth-Timing', timings.join('; '))
  }
  return response
})
