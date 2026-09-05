import AccountSession from '@/models/AccountSession'
import { connectDB } from '@/lib/db'

const REFRESH_TOKEN_EXPIRY_MS = Number(process.env.JWT_REFRESH_TOKEN_EXPIRY || 604800000)

const sessionRevokedCache = global._nexahrAccountSessionRevokedCache || new Map()
global._nexahrAccountSessionRevokedCache = sessionRevokedCache

function parseBrowser(userAgent = '') {
  if (/Edg\//i.test(userAgent)) return 'Microsoft Edge'
  if (/OPR\//i.test(userAgent)) return 'Opera'
  if (/Chrome\//i.test(userAgent)) return 'Chrome'
  if (/Firefox\//i.test(userAgent)) return 'Firefox'
  if (/Safari\//i.test(userAgent)) return 'Safari'
  return 'Unknown browser'
}

function parseOs(userAgent = '') {
  if (/Windows NT/i.test(userAgent)) return 'Windows'
  if (/Android/i.test(userAgent)) return 'Android'
  if (/iPhone|iPad|iPod/i.test(userAgent)) return 'iOS'
  if (/Mac OS X/i.test(userAgent)) return 'macOS'
  if (/Linux/i.test(userAgent)) return 'Linux'
  return 'Unknown OS'
}

function parseDeviceType(userAgent = '') {
  if (/iPad|Tablet/i.test(userAgent)) return 'Tablet'
  if (/Mobi|Android|iPhone/i.test(userAgent)) return 'Mobile'
  if (userAgent) return 'Desktop'
  return 'Unknown'
}

export async function createAccountSession(authUser, req) {
  await connectDB()
  const userAgent = req?.headers?.get?.('user-agent') || null
  const session = await AccountSession.create({
    userId: authUser._id,
    email: String(authUser.email || '').toLowerCase(),
    role: authUser.isSuperAdmin ? 'SUPER_ADMIN' : authUser.role,
    isSuperAdmin: !!authUser.isSuperAdmin,
    tenantId: authUser.isSuperAdmin ? null : authUser.tenantId,
    ipAddress: req?.headers?.get?.('x-forwarded-for')?.split(',')[0]?.trim() || req?.ip || null,
    userAgent,
    browser: parseBrowser(userAgent),
    os: parseOs(userAgent),
    deviceType: parseDeviceType(userAgent),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
  })
  return String(session._id)
}

export async function isAccountSessionRevoked(sessionId) {
  if (!sessionId) return false
  const cached = sessionRevokedCache.get(sessionId)
  if (cached && cached.expiresAt > Date.now()) return cached.revoked

  await connectDB()
  const session = await AccountSession.findById(sessionId).lean()
  const revoked = !session || !!session.revoked || session.expiresAt < new Date()
  sessionRevokedCache.set(sessionId, { revoked, expiresAt: Date.now() + 60000 })
  return revoked
}

export async function touchAccountSession(sessionId) {
  if (!sessionId) return
  await connectDB()
  await AccountSession.updateOne(
    { _id: sessionId, revoked: false, expiresAt: { $gt: new Date() } },
    { $set: { lastSeenAt: new Date() } }
  )
}

export async function revokeAccountSession(sessionId, { revokedBy = null, reason = null } = {}) {
  if (!sessionId) return
  sessionRevokedCache.set(sessionId, { revoked: true, expiresAt: Date.now() + 3600000 })
  await connectDB()
  await AccountSession.updateOne(
    { _id: sessionId },
    { $set: { revoked: true, revokedAt: new Date(), revokedBy, revokedReason: reason } }
  )
}

export async function revokeOtherAccountSessions(session) {
  const currentId = session.accountSessionId
  await connectDB()
  const query = {
    email: String(session.sub || '').toLowerCase(),
    userId: session.userId,
    revoked: false,
    expiresAt: { $gt: new Date() },
  }
  if (currentId) query._id = { $ne: currentId }
  if (!session.isSuperAdmin) query.tenantId = session.tenantId

  const result = await AccountSession.updateMany(query, {
    $set: {
      revoked: true,
      revokedAt: new Date(),
      revokedBy: session.userId,
      revokedReason: 'Security action',
    },
  })
  return result.modifiedCount || 0
}

export async function getActiveAccountSessions(session) {
  await connectDB()
  const query = {
    email: String(session.sub || '').toLowerCase(),
    userId: session.userId,
    revoked: false,
    expiresAt: { $gt: new Date() },
  }
  if (!session.isSuperAdmin) query.tenantId = session.tenantId

  const sessions = await AccountSession.find(query).sort({ lastSeenAt: -1 }).lean()
  return sessions.map((item) => ({
    id: String(item._id),
    isCurrent: String(item._id) === String(session.accountSessionId || ''),
    browser: item.browser,
    os: item.os,
    deviceType: item.deviceType,
    ipAddress: item.ipAddress,
    issuedAt: item.issuedAt,
    lastSeenAt: item.lastSeenAt,
    expiresAt: item.expiresAt,
  }))
}
