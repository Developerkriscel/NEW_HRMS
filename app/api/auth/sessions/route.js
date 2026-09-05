export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { getActiveAccountSessions, revokeOtherAccountSessions } from '@/lib/accountSessions'

export const GET = withApi(async () => {
  const session = await requireAuth()
  if (session.devLogin && process.env.NODE_ENV !== 'production') {
    return ok({
      activeCount: 1,
      currentSessionId: 'dev-session',
      sessions: [{
        id: 'dev-session',
        isCurrent: true,
        browser: 'Development browser',
        os: 'Local dev',
        deviceType: 'Desktop',
        ipAddress: null,
        issuedAt: new Date(),
        lastSeenAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
      }],
    })
  }
  const sessions = await getActiveAccountSessions(session)
  if (!session.accountSessionId) {
    sessions.unshift({
      id: 'current-legacy-session',
      isCurrent: true,
      browser: 'Current browser',
      os: 'Active login',
      deviceType: 'Desktop',
      ipAddress: null,
      issuedAt: new Date(),
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    })
  }
  return ok({
    activeCount: sessions.length,
    currentSessionId: session.accountSessionId || null,
    sessions,
  })
})

export const DELETE = withApi(async () => {
  const session = await requireAuth()
  if (session.devLogin && process.env.NODE_ENV !== 'production') {
    return ok({ revokedCount: 0, activeCount: 1, currentSessionId: 'dev-session', sessions: [] }, 'No other active devices found')
  }
  const revokedCount = await revokeOtherAccountSessions(session)
  const sessions = await getActiveAccountSessions(session)
  if (!session.accountSessionId) {
    sessions.unshift({
      id: 'current-legacy-session',
      isCurrent: true,
      browser: 'Current browser',
      os: 'Active login',
      deviceType: 'Desktop',
      ipAddress: null,
      issuedAt: new Date(),
      lastSeenAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    })
  }
  return ok({
    revokedCount,
    activeCount: sessions.length,
    currentSessionId: session.accountSessionId || null,
    sessions,
  }, revokedCount ? 'Other devices signed out' : 'No other active devices found')
})
