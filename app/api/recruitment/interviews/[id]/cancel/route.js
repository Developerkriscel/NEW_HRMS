export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { INTERVIEW_MANAGE_ROLES, INTERVIEW_STATUS, CANCELLATION_REASON_LIST, SCHEDULE_HISTORY_ACTION } from '@/lib/interviewConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Interview from '@/models/Interview'
import InterviewScheduleHistory from '@/models/InterviewScheduleHistory'
import Application from '@/models/Application'

// POST { reason, comment? } — cancellation reason is mandatory (item 6).
// "Notify both candidate and interviewers" — no email infra in this
// codebase (same honest limitation as every prior step), so the
// notification lands as an activity-log entry on the application, visible
// to HR; there is nothing to actually push to the candidate/panel with.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, INTERVIEW_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!body.reason || !CANCELLATION_REASON_LIST.includes(body.reason)) return fail('A valid cancellation reason is required', 400, 'VALIDATION_ERROR')
  if (body.reason === 'Other' && !body.comment?.trim()) return fail('A comment is required when the reason is "Other"', 400, 'VALIDATION_ERROR')

  const interview = await Interview.findOne({ _id: params.id, tenantId, deleted: false })
  if (!interview) throw new ApiError(404, 'Interview not found', 'NOT_FOUND')
  if (['CANCELLED', 'COMPLETED'].includes(interview.status)) {
    return fail(`Interview is already ${interview.status.toLowerCase()}`, 400, 'INVALID_STATE')
  }

  const actorName = await getActorName(session)
  interview.status = INTERVIEW_STATUS.CANCELLED
  interview.cancelledAt = new Date()
  interview.cancellationReason = body.reason
  interview.cancellationComment = body.comment || null
  await interview.save()

  await InterviewScheduleHistory.create({
    tenantId, interviewId: interview._id, action: SCHEDULE_HISTORY_ACTION.CANCELLED,
    reason: body.reason, comment: body.comment || null,
    changedBy: session.userId, changedByName: actorName, changedAt: new Date(),
  })

  const application = await Application.findOne({ _id: interview.applicationId, tenantId })
  if (application) {
    application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.UPDATED, message: `Interview cancelled: ${interview.roundName} — ${body.reason}`, actorName })
    await application.save()
  }

  await logAction(session, { action: 'INTERVIEW_CANCELLED', entityType: 'Interview', entityId: interview._id, description: `Cancelled: ${body.reason}`, req })

  return ok(interview, 'Interview cancelled')
})
