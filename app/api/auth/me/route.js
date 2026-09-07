export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { ok, fail } from '@/lib/apiResponse'

const JWT_SECRET = process.env.JWT_SECRET || 'NexaHRSuperSecretKey2025ForJWTTokenSigningMustBe256BitsOrMore'
const ACCESS_COOKIE = 'nexahr_token'

function prewarmDatabaseConnection() {
  setTimeout(() => {
    void import('@/lib/db')
      .then(({ connectDB }) => connectDB())
      .catch(() => {})
  }, 0)
}

async function readDevSession() {
  if (process.env.NODE_ENV === 'production') return null
  const token = cookies().get(ACCESS_COOKIE)?.value
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (payload.type === 'access' && payload.devLogin) return payload
  } catch {
    return null
  }
  return null
}

export async function GET() {
  try {
    const devSession = await readDevSession()
    if (devSession) {
      prewarmDatabaseConnection()
      return ok({
        id: devSession.userId,
        name: 'Dev Super Admin',
        email: devSession.sub,
        role: 'SUPER_ADMIN',
        tenantId: null,
        companyName: null,
        permissions: [],
        platformPermissions: ['*'],
        platformRoles: ['PLATFORM_OWNER (dev)'],
        devLogin: true,
      })
    }

    const [{ getSession }, { findUserByEmail, buildUserInfo }] = await Promise.all([
      import('@/lib/auth'),
      import('@/lib/userLookup'),
    ])
    const session = await getSession()
    if (!session) return fail('Authentication required', 401, 'UNAUTHENTICATED')

    if (session.name) {
      prewarmDatabaseConnection()
      return ok({
        id: session.userId,
        name: session.name,
        email: session.sub,
        role: session.role,
        tenantId: session.tenantId || null,
        companyName: session.companyName || null,
        companySlug: session.companySlug || null,
        permissions: session.permissions || [],
        moduleAccess: session.moduleAccess || [],
        platformPermissions: session.platformPermissions || [],
        platformRoles: session.platformRoles || [],
        devLogin: !!session.devLogin,
      })
    }

    const found = await findUserByEmail(session.sub, { tenantId: session.tenantId })
    if (!found) return fail('User not found', 404)
    const userInfo = await buildUserInfo(found)
    return ok(userInfo)
  } catch (err) {
    if (err?.status) return fail(err.message, err.status, err.errorCode)
    if (err?.name === 'MongooseServerSelectionError') {
      return fail('MongoDB is unreachable. Use the dev shortcut or configure a reachable MongoDB URI.', 503, 'DATABASE_UNAVAILABLE')
    }
    console.error(err)
    return NextResponse.json(
      { success: false, message: 'Internal server error', data: null, timestamp: new Date().toISOString(), errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
