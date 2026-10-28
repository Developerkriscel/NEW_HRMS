export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { INTERVIEW_MANAGE_ROLES, INTERVIEW_STATUS } from '@/lib/interviewConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { createNotification } from '@/lib/notifications'
import Interview from '@/models/Interview'
import InterviewPanelMember from '@/models/InterviewPanelMember'
import Application from '@/models/Application'

// POST — "Interview Completed -> Feedback Pending" (the flow diagram).
// Feedback submission later auto-promotes FEEDBACK_PENDING -> COMPLETED
// once every panelist has submitted (see the feedback route).
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, INTERVIEW_MANAGE_ROLES)
  const tenantId = requireTenantId(session)

  const interview = await Interview.findOne({ _id: params.id, tenantId, deleted: false })
  if (!interview) throw new ApiError(404, 'Interview not found', 'NOT_FOUND')
  if (!['SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'IN_PROGRESS'].includes(interview.status)) {
    return fail(`Cannot mark a ${interview.status.toLowerCase()} interview as complete`, 400, 'INVALID_STATE')
  }

  const actorName = await getActorName(session)
  interview.completedAt = new Date()
  interview.status = INTERVIEW_STATUS.FEEDBACK_PENDING
  await interview.save()

  const application = await Application.findOne({ _id: interview.applicationId, tenantId })
  if (application) {
    application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.UPDATED, message: `Interview completed: ${interview.roundName} — feedback pending`, actorName })
    await application.save()
  }

  const acceptedPanel = await InterviewPanelMember.find({
    tenantId,
    interviewId: interview._id,
    assignmentStatus: 'ACCEPTED',
  }).select('_id employeeId').lean()
  await Promise.all(acceptedPanel.map((member) => createNotification({
    userId: member.employeeId,
    tenant: tenantId,
    title: 'Interview outcome required',
    message: `Record your Select or Reject recommendation for the completed ${interview.roundName}.`,
    type: 'warning',
    category: 'interview',
    link: '/notifications',
    metadata: { kind: 'INTERVIEW_OUTCOME_REQUEST', decision: 'PENDING', interviewId: String(interview._id), panelMemberId: String(member._id) },
  })))

  await logAction(session, { action: 'INTERVIEW_COMPLETED', entityType: 'Interview', entityId: interview._id, description: `${interview.roundName} marked complete`, req })

  return ok(interview, 'Interview marked complete')
})
