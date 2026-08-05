import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { connectDB } from './db'
import TokenBlacklist from '@/models/TokenBlacklist'
import PlatformSession from '@/models/PlatformSession'
import { applyTenantContextForSession } from '@/lib/tenantDb'

// NOTE: unlike the original Spring Boot backend (which only embedded the
// user's email in the JWT subject and re-derived role/tenant/permissions
// from Postgres on every request), this rewrite embeds role, tenantId,
// isSuperAdmin and permissions directly as claims. That's a deliberate
// change: Next.js middleware runs on the Edge runtime and cannot open a
// MongoDB connection, so route-guarding in middleware.js needs everything
// it needs to know already inside the token. API routes still independently
// re-verify via getSession()/requireAuth() below, which also checks the
// token blacklist (logout) against MongoDB — something the Java version's
// filter never actually did despite writing blacklist entries on logout.
export const ACCESS_TOKEN_EXPIRY_MS = Number(process.env.JWT_ACCESS_TOKEN_EXPIRY || 3600000)
export const REFRESH_TOKEN_EXPIRY_MS = Number(process.env.JWT_REFRESH_TOKEN_EXPIRY || 604800000)
const JWT_SECRET = process.env.JWT_SECRET || 'NexaHRSuperSecretKey2025ForJWTTokenSigningMustBe256BitsOrMore'

export const ACCESS_COOKIE = 'nexahr_token'
export const REFRESH_COOKIE = 'nexahr_refresh'

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 12)
}

export async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}

export function validatePasswordStrength(password) {
  if (!password || password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' }
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one digit' }
  }
  return { valid: true }
}

function buildClaims(user) {
  if (user.isSuperAdmin) {
    return {
      sub: user.email,
      userId: String(user._id),
      isSuperAdmin: true,
      role: 'SUPER_ADMIN',
      tenantId: null,
      permissions: [],
      platformPermissions: user.platformPermissions || [],
      platformRoles: user.platformRoles || [],
      sessionId: user.sessionId || null,
      devLogin: !!user.devLogin,
    }
  }
  return {
    sub: user.email,
    userId: String(user._id),
    isSuperAdmin: false,
    role: user.role,
    tenantId: String(user.tenantId),
    permissions: (user.permissions || []).map((p) => (typeof p === 'string' ? p : p.name)),
  }
}

export function generateAccessToken(user) {
  return jwt.sign({ ...buildClaims(user), type: 'access' }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000),
  })
}

export function generateRefreshToken(user) {
  return jwt.sign({ ...buildClaims(user), type: 'refresh' }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: Math.floor(REFRESH_TOKEN_EXPIRY_MS / 1000),
  })
}

export function verifyJwt(token) {
  return jwt.verify(token, JWT_SECRET)
}

export function decodeJwt(token) {
  return jwt.decode(token)
}

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(maxAgeMs / 1000),
  }
}

export function setAuthCookies(cookieStore, accessToken, refreshToken) {
  cookieStore.set(ACCESS_COOKIE, accessToken, cookieOptions(ACCESS_TOKEN_EXPIRY_MS))
  cookieStore.set(REFRESH_COOKIE, refreshToken, cookieOptions(REFRESH_TOKEN_EXPIRY_MS))
}

export function clearAuthCookies(cookieStore) {
  cookieStore.set(ACCESS_COOKIE, '', { ...cookieOptions(0), maxAge: 0 })
  cookieStore.set(REFRESH_COOKIE, '', { ...cookieOptions(0), maxAge: 0 })
}

export async function blacklistToken(token) {
  const decoded = decodeJwt(token)
  if (decoded?.devLogin && process.env.NODE_ENV !== 'production') return
  await connectDB()
  const expiresAt = decoded?.exp ? new Date(decoded.exp * 1000) : new Date(Date.now() + 3600000)
  await TokenBlacklist.updateOne(
    { token },
    { $setOnInsert: { token, expiresAt } },
    { upsert: true }
  )
}

export async function isTokenBlacklisted(token) {
  const decoded = decodeJwt(token)
  if (decoded?.devLogin && process.env.NODE_ENV !== 'production') return false
  await connectDB()
  const found = await TokenBlacklist.findOne({ token }).lean()
  return !!found
}

export function requestIp(req) {
  return req?.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() || req?.ip || null
}

export function requestUserAgent(req) {
  return req?.headers?.get?.('user-agent') || null
}

// Creates the server-side session record a platform operator's tokens are
// keyed to (via the `sessionId` claim), so the session can be revoked
// (logout, forced revocation) before the JWT itself expires.
export async function createPlatformSession(operatorId, req) {
  await connectDB()
  const session = await PlatformSession.create({
    operator: operatorId,
    ipAddress: requestIp(req),
    userAgent: requestUserAgent(req),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
  })
  return String(session._id)
}

export async function revokePlatformSession(sessionId, { revokedBy = null, reason = null } = {}) {
  if (!sessionId) return
  await connectDB()
  await PlatformSession.updateOne(
    { _id: sessionId },
    { revoked: true, revokedAt: new Date(), revokedBy, revokedReason: reason }
  )
}

// Legacy tokens issued before session tracking existed have no sessionId —
// those are treated as still valid so existing logged-in operators aren't
// force-logged-out by this change; they get a real session on next login.
export async function isPlatformSessionRevoked(sessionId) {
  if (!sessionId) return false
  await connectDB()
  const session = await PlatformSession.findById(sessionId).lean()
  if (!session) return false
  return !!session.revoked || session.expiresAt < new Date()
}

// Reads the access-token cookie, verifies signature/expiry, and checks the
// blacklist. Returns the decoded claims (session) or null. Use inside API
// route handlers (Node.js runtime only — not middleware).
export async function getSession() {
  const cookieStore = cookies()
  const token = cookieStore.get(ACCESS_COOKIE)?.value
  if (!token) return null

  let decoded
  try {
    decoded = verifyJwt(token)
  } catch {
    return null
  }
  if (decoded.type !== 'access') return null

  if (await isTokenBlacklisted(token)) return null

  if (decoded.isSuperAdmin && !decoded.devLogin && decoded.sessionId) {
    if (await isPlatformSessionRevoked(decoded.sessionId)) return null
  }

  return decoded
}

export class ApiError extends Error {
  constructor(status, message, errorCode) {
    super(message)
    this.status = status
    this.errorCode = errorCode || null
  }
}

export async function requireAuth() {
  const session = await getSession()
  if (!session) throw new ApiError(401, 'Authentication required', 'UNAUTHENTICATED')
  await applyTenantContextForSession(session)
  return session
}

export async function requireRole(session, roles) {
  const allowed = Array.isArray(roles) ? roles : [roles]
  if (!allowed.includes(session.role)) {
    throw new ApiError(403, 'You do not have permission to perform this action', 'FORBIDDEN')
  }
}

export function requireTenantId(session) {
  if (!session.tenantId) throw new ApiError(400, 'No tenant context for this user', 'NO_TENANT')
  return session.tenantId
}
