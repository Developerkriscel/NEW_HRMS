export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { ok, fail } from '@/lib/apiResponse'
import { ApiError, requireAuth } from '@/lib/auth'
import { findUserByEmail, buildUserInfo } from '@/lib/userLookup'

export async function GET() {
  try {
    const session = await requireAuth()

    if (session.devLogin && process.env.NODE_ENV !== 'production') {
      return ok({
        id: session.userId,
        name: 'Dev Super Admin',
        email: session.sub,
        role: 'SUPER_ADMIN',
        tenantId: null,
        companyName: null,
        permissions: [],
        platformPermissions: ['*'],
        platformRoles: ['PLATFORM_OWNER (dev)'],
        devLogin: true,
      })
    }

    const found = await findUserByEmail(session.sub, { tenantId: session.tenantId })
    if (!found) return fail('User not found', 404)
    const userInfo = await buildUserInfo(found)
    return ok(userInfo)
  } catch (err) {
    if (err instanceof ApiError) return fail(err.message, err.status, err.errorCode)
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
