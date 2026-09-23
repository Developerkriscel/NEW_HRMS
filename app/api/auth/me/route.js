export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'
import { ok, fail } from '@/lib/apiResponse'
import { buildDevUserForEmail } from '@/lib/devLogin'

const JWT_SECRET = process.env.JWT_SECRET || 'NexaHRSuperSecretKey2025ForJWTTokenSigningMustBe256BitsOrMore'
const ACCESS_COOKIE = 'nexahr_token'

async function readDevSession() {
  if (process.env.NODE_ENV === 'production') return null
  const token = cookies().get(ACCESS_COOKIE)?.value
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    if (payload.type === 'access' && payload.devLogin) {
      const currentDevUser = buildDevUserForEmail(payload.sub)
      if (!currentDevUser) return payload
      return {
        ...payload,
        userId: currentDevUser.id,
        name: currentDevUser.name,
        role: currentDevUser.role,
        tenantId: currentDevUser.tenantId || null,
        companyName: currentDevUser.companyName || null,
        companySlug: currentDevUser.companySlug || null,
        tenantDatabaseName: currentDevUser.tenantDatabaseName || null,
        permissions: currentDevUser.permissions || [],
        moduleAccess: currentDevUser.moduleAccess || [],
        platformPermissions: currentDevUser.platformPermissions || [],
        platformRoles: currentDevUser.platformRoles || [],
      }
    }
  } catch {
    return null
  }
  return null
}

export async function GET() {
  try {
    const devSession = await readDevSession()
    if (devSession) {
      return ok({
        id: devSession.userId,
        name: devSession.name || 'Dev User',
        email: devSession.sub,
        role: devSession.role,
        tenantId: devSession.tenantId || null,
        companyName: devSession.companyName || null,
        companySlug: devSession.companySlug || null,
        permissions: devSession.permissions || [],
        moduleAccess: devSession.moduleAccess || [],
        platformPermissions: devSession.platformPermissions || [],
        platformRoles: devSession.platformRoles || [],
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
