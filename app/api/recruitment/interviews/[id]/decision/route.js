import mongoose from 'mongoose'
import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import { getActorName } from '@/lib/candidateHelpers'
import Interview from '@/models/Interview'
import InterviewPanelMember from '@/models/InterviewPanelMember'

// Interviewer outcome after the meeting. This is separate from assignment
// acceptance: HR/Admin still owns the final application Select/Reject action.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  if (!mongoose.isValidObjectId(params.id)) return fail('Interview not found', 404, 'NOT_FOUND')
  const body = await req.json().catch(() => ({}))
  const decision = String(body.decision || '').toUpperCase()
  if (!['SELECTED', 'REJECTED'].includes(decision)) return fail('Decision must be SELECTED or REJECTED.', 400, 'VALIDATION_ERROR')

  const interview = await Interview.findOne({ _id: params.id, tenantId, deleted: false }).select('_id applicationId roundName status scheduledBy')
  if (!interview) return fail('Interview not found', 404, 'NOT_FOUND')
  if (!['COMPLETED', 'FEEDBACK_PENDING'].includes(interview.status)) {
    return fail('Complete the interview before recording a Select or Reject decision.', 400, 'INVALID_STATE')
  }
  const member = await InterviewPanelMember.findOne({ tenantId, interviewId: interview._id, employeeId: session.userId })
  if (!member) return fail('You are not assigned to this interview.', 403, 'FORBIDDEN')
  if (member.assignmentStatus !== 'ACCEPTED') return fail('Accept the interview assignment before recording your decision.', 400, 'INVALID_STATE')

  member.interviewDecision = decision
  member.decisionComment = body.comment ? String(body.comment).trim().slice(0, 1000) : null
  member.decisionAt = new Date()
  member.decisionBy = session.userId
  await member.save()

  const actorName = await getActorName(session)
  await createNotification({
    userId: interview.scheduledBy,
    tenant: tenantId,
    title: `Interviewer ${decision === 'SELECTED' ? 'recommended Select' : 'recommended Reject'}`,
    message: `${actorName} ${decision === 'SELECTED' ? 'recommended selecting' : 'recommended rejecting'} the candidate after the ${interview.roundName}. HR/Admin review is required for the final decision.`,
    type: decision === 'SELECTED' ? 'success' : 'warning',
    category: 'interview',
    link: '/hr/recruitment/interviews',
    metadata: { kind: 'INTERVIEW_OUTCOME', decision, interviewId: String(interview._id), applicationId: String(interview.applicationId), panelMemberId: String(member._id) },
  })

  return ok({ member }, `Interview ${decision === 'SELECTED' ? 'selection' : 'rejection'} recommendation saved`)
})
