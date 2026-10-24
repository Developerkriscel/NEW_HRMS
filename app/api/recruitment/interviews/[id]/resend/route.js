export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { INTERVIEW_MANAGE_ROLES, INTERVIEW_STATUS } from '@/lib/interviewConstants'
import { assertTenantMailReady } from '@/lib/tenantMail'
import { buildInterviewEmailDraft, sendInterviewInviteEmail } from '@/lib/interviewEmailDelivery'
import Interview from '@/models/Interview'
import '@/models/Candidate'
import '@/models/Job'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, INTERVIEW_MANAGE_ROLES)
  const tenantId = requireTenantId(session)

  const interview = await Interview.findOne({ _id: params.id, tenantId, deleted: false })
    .populate('candidateId')
    .populate('jobId')
  if (!interview) return fail('Interview not found', 404, 'NOT_FOUND')
  if (interview.status === INTERVIEW_STATUS.CANCELLED) return fail('Cancelled interviews cannot receive an invite', 400, 'INVALID_STATE')
  if (!interview.candidateId?.email) return fail('Candidate email is missing', 400, 'VALIDATION_ERROR')

  const body = await req.json().catch(() => ({}))
  const draft = buildInterviewEmailDraft({ candidate: interview.candidateId, job: interview.jobId, interview, body })
  await assertTenantMailReady(tenantId)

  try {
    await sendInterviewInviteEmail({
      tenantId,
      candidate: interview.candidateId,
      job: interview.jobId,
      interview,
      body: { ...body, candidateEmail: interview.candidateId.email, candidateEmailSubject: draft.subject, candidateEmailBody: draft.body },
    })
  } catch (error) {
    interview.candidateInviteStatus = 'FAILED'
    interview.candidateInviteError = error.message || 'Interview invite email failed'
    await interview.save()
    throw error
  }

  interview.candidateInviteSubject = draft.subject
  interview.candidateInstructions = draft.body
  interview.candidateInviteStatus = 'SENT'
  interview.candidateInviteSentAt = new Date()
  interview.candidateInviteError = null
  await interview.save()

  await logAction(session, {
    action: 'INTERVIEW_INVITE_RESENT',
    entityType: 'Interview',
    entityId: interview._id,
    description: `Interview invite resent for ${interview.roundName}`,
    req,
  })

  return ok({ interview }, 'Interview invite sent')
})
