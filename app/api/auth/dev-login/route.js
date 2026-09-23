export const dynamic = 'force-dynamic'

import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { buildDevUserForRole, isDevAuthAllowed } from '@/lib/devLogin'

const JWT_SECRET = process.env.JWT_SECRET || 'NexaHRSuperSecretKey2025ForJWTTokenSigningMustBe256BitsOrMore'
const ACCESS_TOKEN_EXPIRY_MS = Number(process.env.JWT_ACCESS_TOKEN_EXPIRY || 3600000)
const REFRESH_TOKEN_EXPIRY_MS = Number(process.env.JWT_REFRESH_TOKEN_EXPIRY || 604800000)

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(maxAgeMs / 1000),
  }
}

function signToken(user, type) {
  return jwt.sign(
    {
      sub: user.email,
      userId: user.id,
      isSuperAdmin: user.role === 'SUPER_ADMIN',
      role: user.role,
      name: user.name,
      tenantId: user.tenantId || null,
      companyName: user.companyName || null,
      companySlug: user.companySlug || null,
      tenantDatabaseName: user.tenantDatabaseName || null,
      permissions: user.permissions || [],
      moduleAccess: user.moduleAccess || [],
      platformPermissions: user.platformPermissions || [],
      platformRoles: user.platformRoles || [],
      sessionId: null,
      accountSessionId: null,
      devLogin: true,
      type,
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: Math.floor((type === 'access' ? ACCESS_TOKEN_EXPIRY_MS : REFRESH_TOKEN_EXPIRY_MS) / 1000),
    }
  )
}

export async function POST(req) {
  if (!isDevAuthAllowed(req)) {
    return NextResponse.json(
      { success: false, message: 'Dev login is disabled in production', data: null, errorCode: 'FORBIDDEN', timestamp: new Date().toISOString() },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const requestedRole = String(body.role || 'SUPER_ADMIN').toUpperCase()
  const user = buildDevUserForRole(requestedRole)

  const cookieStore = cookies()
  cookieStore.set('nexahr_token', signToken(user, 'access'), cookieOptions(ACCESS_TOKEN_EXPIRY_MS))
  cookieStore.set('nexahr_refresh', signToken(user, 'refresh'), cookieOptions(REFRESH_TOKEN_EXPIRY_MS))

  return NextResponse.json({
    success: true,
    message: 'Dev login successful',
    data: {
      user: { ...user, devLogin: true },
      expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000),
    },
    errorCode: null,
    timestamp: new Date().toISOString(),
  })
}
