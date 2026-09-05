export const dynamic = 'force-dynamic'

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { ok, fail } from '@/lib/apiResponse'
import { ApiError, blacklistToken, clearAuthCookies, decodeJwt, revokePlatformSession, ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/auth'
import { revokeAccountSession } from '@/lib/accountSessions'

export async function POST() {
  try {
    const cookieStore = cookies()
    const accessToken = cookieStore.get(ACCESS_COOKIE)?.value
    const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value
    const decoded = decodeJwt(accessToken)
    const isDevLogin = decoded?.devLogin && process.env.NODE_ENV !== 'production'

    if (!isDevLogin) {
      if (accessToken) await blacklistToken(accessToken)
      if (refreshToken) await blacklistToken(refreshToken)
      if (decoded?.isSuperAdmin && decoded?.sessionId) {
        await revokePlatformSession(decoded.sessionId, { revokedBy: decoded.userId, reason: 'Operator logout' })
      }
      if (decoded?.accountSessionId) {
        await revokeAccountSession(decoded.accountSessionId, { revokedBy: decoded.userId, reason: 'User logout' })
      }
    }

    clearAuthCookies(cookieStore)
    return ok(null, 'Logged out successfully')
  } catch (err) {
    if (err instanceof ApiError) return fail(err.message, err.status, err.errorCode)
    if (err?.name === 'MongooseServerSelectionError') {
      clearAuthCookies(cookies())
      return ok(null, 'Logged out locally')
    }
    console.error(err)
    return NextResponse.json(
      { success: false, message: 'Internal server error', data: null, timestamp: new Date().toISOString(), errorCode: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
