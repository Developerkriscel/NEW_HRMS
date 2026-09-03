export const dynamic = 'force-dynamic'

import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET || 'NexaHRSuperSecretKey2025ForJWTTokenSigningMustBe256BitsOrMore'
const ACCESS_TOKEN_EXPIRY_MS = Number(process.env.JWT_ACCESS_TOKEN_EXPIRY || 3600000)
const REFRESH_TOKEN_EXPIRY_MS = Number(process.env.JWT_REFRESH_TOKEN_EXPIRY || 604800000)

function prewarmDatabaseConnection() {
  // Do not block the dev-login response, but start the Mongo handshake early
  // so the first real data module does not pay the full connection cost.
  setTimeout(() => {
    void import('@/lib/db')
      .then(({ connectDB }) => connectDB())
      .catch(() => {})
  }, 0)
}

function cookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(maxAgeMs / 1000),
  }
}

function signToken(type) {
  return jwt.sign(
    {
      sub: 'admin@nexahr.io',
      userId: 'dev-super-admin',
      isSuperAdmin: true,
      role: 'SUPER_ADMIN',
      tenantId: null,
      permissions: [],
      platformPermissions: ['*'],
      platformRoles: ['PLATFORM_OWNER (dev)'],
      sessionId: null,
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

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { success: false, message: 'Dev login is disabled in production', data: null, errorCode: 'FORBIDDEN', timestamp: new Date().toISOString() },
      { status: 403 }
    )
  }

  const cookieStore = cookies()
  cookieStore.set('nexahr_token', signToken('access'), cookieOptions(ACCESS_TOKEN_EXPIRY_MS))
  cookieStore.set('nexahr_refresh', signToken('refresh'), cookieOptions(REFRESH_TOKEN_EXPIRY_MS))
  prewarmDatabaseConnection()

  return NextResponse.json({
    success: true,
    message: 'Dev login successful',
    data: {
      user: {
        id: 'dev-super-admin',
        name: 'Dev Super Admin',
        email: 'admin@nexahr.io',
        role: 'SUPER_ADMIN',
        tenantId: null,
        companyName: null,
        permissions: [],
        platformPermissions: ['*'],
        platformRoles: ['PLATFORM_OWNER (dev)'],
        devLogin: true,
      },
      expiresIn: Math.floor(ACCESS_TOKEN_EXPIRY_MS / 1000),
    },
    errorCode: null,
    timestamp: new Date().toISOString(),
  })
}
