export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { INTERVIEW_MANAGE_ROLES, INTERVIEW_STATUS, NO_SHOW_TYPE, ATTENDANCE_STATUS } from '@/lib/interviewConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Interview from '@/models/Interview'
import InterviewPanelMember from '@/models/InterviewPanelMember'
import Application from '@/models/Application'

// POST { type: 'CANDIDATE'|'INTERVIEWER', employeeId?, comment? }
// Item 10 — supports both. HR then has Reschedule / Close Application /
// Hold available from the interview detail page (existing endpoints).
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, INTERVIEW_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!Object.values(NO_SHOW_TYPE).includes(body.type)) return fail('type must be CANDIDATE or INTERVIEWER', 400, 'VALIDATION_ERROR')

  const interview = await Interview.findOne({ _id: params.id, tenantId, deleted: false })
  if (!interview) throw new ApiError(404, 'Interview not found', 'NOT_FOUND')
  if (['CANCELLED', 'COMPLETED'].includes(interview.status)) {
    return fail(`Cannot mark a ${interview.status.toLowerCase()} interview as no-show`, 400, 'INVALID_STATE')
  }

  const actorName = await getActorName(session)
  interview.status = INTERVIEW_STATUS.NO_SHOW
  interview.noShowType = body.type
  await interview.save()

  if (body.type === NO_SHOW_TYPE.INTERVIEWER && body.employeeId) {
    await InterviewPanelMember.updateOne({ tenantId, interviewId: interview._id, employeeId: body.employeeId }, { attendanceStatus: ATTENDANCE_STATUS.NO_SHOW })
  }

  const application = await Application.findOne({ _id: interview.applicationId, tenantId })
  if (application) {
    application.activityLog.push({
      type: ACTIVITY_ENTRY_TYPE.UPDATED,
      message: `${body.type === 'CANDIDATE' ? 'Candidate' : 'Interviewer'} no-show recorded for ${interview.roundName}${body.comment ? `: ${body.comment}` : ''}`,
      actorName,
    })
    await application.save()
  }

  await logAction(session, { action: 'INTERVIEW_NO_SHOW', entityType: 'Interview', entityId: interview._id, description: `${body.type} no-show`, req })

  return ok(interview, 'No-show recorded')
})
