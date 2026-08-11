export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { INTERVIEW_MANAGE_ROLES, INTERVIEW_STATUS, SCHEDULE_HISTORY_ACTION } from '@/lib/interviewConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Interview from '@/models/Interview'
import InterviewScheduleHistory from '@/models/InterviewScheduleHistory'
import Application from '@/models/Application'

// POST { date, startTime, endTime, reason } — "Do not overwrite without an
// audit trail": the previous schedule is captured in
// interview_schedule_history before anything on Interview itself changes.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, INTERVIEW_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!body.date || !body.startTime || !body.endTime) return fail('New date, start time and end time are required', 400, 'VALIDATION_ERROR')
  if (!body.reason?.trim()) return fail('A reason is required to reschedule', 400, 'VALIDATION_ERROR')

  const interview = await Interview.findOne({ _id: params.id, tenantId, deleted: false })
  if (!interview) throw new ApiError(404, 'Interview not found', 'NOT_FOUND')
  if (['CANCELLED', 'COMPLETED', 'NO_SHOW'].includes(interview.status)) {
    return fail(`Cannot reschedule a ${interview.status.toLowerCase()} interview`, 400, 'INVALID_STATE')
  }

  const actorName = await getActorName(session)
  await InterviewScheduleHistory.create({
    tenantId, interviewId: interview._id, action: SCHEDULE_HISTORY_ACTION.RESCHEDULED,
    previousDate: interview.date, previousStartTime: interview.startTime, previousEndTime: interview.endTime,
    newDate: new Date(body.date), newStartTime: body.startTime, newEndTime: body.endTime,
    reason: body.reason.trim(), comment: body.comment || null,
    changedBy: session.userId, changedByName: actorName, changedAt: new Date(),
  })

  const previousLabel = `${interview.date.toDateString()} ${interview.startTime}`
  interview.date = new Date(body.date)
  interview.startTime = body.startTime
  interview.endTime = body.endTime
  interview.status = INTERVIEW_STATUS.SCHEDULED // freshly scheduled at the new time; RESCHEDULED is recorded in history, not held as the live status
  await interview.save()

  const application = await Application.findOne({ _id: interview.applicationId, tenantId })
  if (application) {
    application.activityLog.push({
      type: ACTIVITY_ENTRY_TYPE.UPDATED,
      message: `Interview rescheduled: ${previousLabel} → ${interview.date.toDateString()} ${interview.startTime} (${body.reason})`,
      actorName,
    })
    await application.save()
  }

  await logAction(session, { action: 'INTERVIEW_RESCHEDULED', entityType: 'Interview', entityId: interview._id, description: `Rescheduled: ${body.reason}`, req })

  return ok(interview, 'Interview rescheduled')
})
