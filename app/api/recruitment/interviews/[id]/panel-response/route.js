import mongoose from 'mongoose'
import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import { createNotification } from '@/lib/notifications'
import Interview from '@/models/Interview'
import InterviewPanelMember from '@/models/InterviewPanelMember'
import Notification from '@/models/Notification'
import Employee from '@/models/Employee'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  if (!mongoose.isValidObjectId(params.id)) return fail('Interview not found', 404, 'NOT_FOUND')
  const body = await req.json().catch(() => ({}))
  const decision = String(body.decision || '').toUpperCase()
  if (!['ACCEPTED', 'REJECTED'].includes(decision)) return fail('Decision must be ACCEPTED or REJECTED.', 400, 'VALIDATION_ERROR')

  const interview = await Interview.findOne({ _id: params.id, tenantId, deleted: false }).select('_id roundName scheduledBy')
  if (!interview) return fail('Interview not found', 404, 'NOT_FOUND')
  const member = await InterviewPanelMember.findOne({ interviewId: interview._id, employeeId: session.userId, tenantId })
  if (!member) return fail('You are not assigned to this interview.', 403, 'FORBIDDEN')
  // Make repeated clicks idempotent. The member update may have succeeded
  // while the notification request was retried, so accepting an already
  // accepted assignment should refresh the notification instead of showing a
  // misleading error.
  if (member.assignmentStatus !== 'PENDING' && member.assignmentStatus !== decision) {
    return fail(`This assignment is already ${member.assignmentStatus.toLowerCase()}.`, 400, 'INVALID_STATE')
  }

  if (member.assignmentStatus === decision) {
    if (body.notificationId && mongoose.isValidObjectId(body.notificationId)) {
      await Notification.updateOne(
        { _id: body.notificationId, tenant: tenantId, userId: String(session.userId) },
        { $set: { read: true, readAt: new Date(), 'metadata.decision': decision, 'metadata.respondedAt': new Date() } }
      )
    }
    return ok({ member }, `Interview assignment already ${decision === 'ACCEPTED' ? 'approved' : 'rejected'}`)
  }

  member.assignmentStatus = decision
  member.respondedAt = new Date()
  member.responseComment = body.comment ? String(body.comment).trim().slice(0, 500) : null
  await member.save()

  const employee = await Employee.findOne({ _id: session.userId, tenantId }).select('firstName lastName').lean()
  await createNotification({
    userId: interview.scheduledBy,
    tenant: tenantId,
    title: `Interviewer ${decision === 'ACCEPTED' ? 'accepted' : 'rejected'} the assignment`,
    message: `${employee ? `${employee.firstName} ${employee.lastName}`.trim() : 'The interviewer'} has ${decision === 'ACCEPTED' ? 'accepted' : 'rejected'} the ${interview.roundName} assignment.`,
    type: decision === 'ACCEPTED' ? 'success' : 'warning',
    category: 'interview',
    link: '/hr/recruitment',
    metadata: { kind: 'INTERVIEW_ASSIGNMENT_RESPONSE', decision, interviewId: String(interview._id), panelMemberId: String(member._id) },
  })

  if (body.notificationId && mongoose.isValidObjectId(body.notificationId)) {
    await Notification.updateOne(
      { _id: body.notificationId, tenant: tenantId, userId: String(session.userId) },
      { $set: { read: true, readAt: new Date(), 'metadata.decision': decision, 'metadata.respondedAt': new Date() } }
    )
  }
  return ok({ member }, `Interview assignment ${decision === 'ACCEPTED' ? 'approved' : 'rejected'}`)
})
