import AuditLog from '@/models/AuditLog'
import { requestIp, requestUserAgent } from '@/lib/auth'

// Best-effort audit logging — matches the original AuditLogService: failures
// are swallowed so they never break the calling request. There is no
// `@Async` thread pool equivalent in a serverless route handler, so this is
// simply awaited inline (fire-and-forget isn't reliable once the response
// is sent in most Next.js deployment targets). Append-only: nothing in this
// module ever updates or deletes an existing AuditLog document.
export async function logAction(session, { action, entityType, entityId, description, oldValue, newValue, reason, req }) {
  try {
    await AuditLog.create({
      tenantId: session.isSuperAdmin ? null : session.tenantId,
      actorType: session.isSuperAdmin ? 'PLATFORM_OPERATOR' : 'EMPLOYEE',
      performedBy: session.userId,
      performerEmail: session.sub,
      performerRole: session.isSuperAdmin ? 'SUPER_ADMIN' : session.role,
      action,
      entityType,
      entityId: entityId ? String(entityId) : null,
      description,
      oldValue: oldValue != null ? String(oldValue) : null,
      newValue: newValue != null ? String(newValue) : null,
      reason: reason || null,
      requestId: req?.headers?.get?.('x-request-id') || null,
      ipAddress: req ? requestIp(req) : null,
      userAgent: req ? requestUserAgent(req) : null,
    })
  } catch (err) {
    console.error('audit log failed', err)
  }
}

export async function logSuperAdmin(session, fields) {
  return logAction({ ...session, isSuperAdmin: true }, fields)
}
