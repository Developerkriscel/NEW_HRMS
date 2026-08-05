import SupportRequest from '@/models/SupportRequest'
import SupportAccessSession from '@/models/SupportAccessSession'
import SupportAccessEvent from '@/models/SupportAccessEvent'
import { ApiError } from '@/lib/auth'

// Approving a request is the only way a session gets created — there is no
// "log in as this tenant" shortcut anywhere in the codebase. The session's
// own expiresAt is independent of the request, computed once at approval
// time, and nothing here ever creates a session without one.
export async function approveSupportRequest({ request, operator, reason }) {
  if (request.status !== 'PENDING') {
    throw new ApiError(400, `Request is ${request.status}, not PENDING`, 'NOT_PENDING')
  }

  request.status = 'APPROVED'
  request.internalApprover = operator.userId
  request.decisionReason = reason
  request.decidedAt = new Date()
  await request.save()

  const startsAt = request.startTime > new Date() ? request.startTime : new Date()
  const expiresAt = new Date(startsAt.getTime() + request.durationMinutes * 60000)

  const session = await SupportAccessSession.create({
    supportRequest: request._id,
    tenant: request.tenant,
    operator: request.requestedBy,
    scope: request.requestedScope,
    modules: request.requestedModules,
    accessMode: request.accessMode,
    startsAt,
    expiresAt,
    approvedBy: operator.userId,
  })

  return session
}

export async function declineSupportRequest({ request, operator, reason }) {
  if (request.status !== 'PENDING') {
    throw new ApiError(400, `Request is ${request.status}, not PENDING`, 'NOT_PENDING')
  }
  request.status = 'DECLINED'
  request.internalApprover = operator.userId
  request.decisionReason = reason
  request.decidedAt = new Date()
  await request.save()
  return request
}

// Lazily expires a session on read — there is no scheduled job to sweep
// these (see the Phase 0 architecture assessment), so every route that
// reads a session's status calls this first rather than trusting a
// possibly-stale ACTIVE flag.
export async function refreshSessionStatus(session) {
  if (session.status === 'ACTIVE' && session.expiresAt <= new Date()) {
    session.status = 'EXPIRED'
    await session.save()
  }
  return session
}

export async function revokeSupportSession({ session, operator, reason }) {
  await refreshSessionStatus(session)
  if (session.status !== 'ACTIVE') {
    throw new ApiError(400, `Session is ${session.status}, not ACTIVE`, 'NOT_ACTIVE')
  }
  session.status = 'REVOKED'
  session.revokedBy = operator.userId
  session.revokedAt = new Date()
  session.revokedReason = reason
  await session.save()
  return session
}

export async function logSupportEvent({ session, eventType, description, operator }) {
  return SupportAccessEvent.create({
    session: session._id,
    eventType,
    description,
    performedBy: operator.userId,
  })
}

// The one enforcement point every future tenant-data-access route should
// call before honoring a support-session-based request: the session must
// belong to this operator, be currently active (not just approved), target
// this exact tenant, and — if a module scope was granted — the requested
// module must be in it. A blank `modules` list on the session means
// "no module restriction beyond the approved scope."
export async function assertSupportSessionScope({ session, operator, tenantId, module }) {
  await refreshSessionStatus(session)
  if (String(session.operator) !== String(operator.userId)) {
    throw new ApiError(403, 'This support session does not belong to you', 'FORBIDDEN')
  }
  if (session.status !== 'ACTIVE') {
    throw new ApiError(403, `Support session is ${session.status}, not ACTIVE`, 'SESSION_NOT_ACTIVE')
  }
  if (String(session.tenant) !== String(tenantId)) {
    throw new ApiError(403, 'This support session is not approved for that tenant', 'TENANT_OUT_OF_SCOPE')
  }
  if (module && session.modules?.length && !session.modules.includes(module)) {
    throw new ApiError(403, `This support session was not approved for the ${module} module`, 'MODULE_OUT_OF_SCOPE')
  }
}
