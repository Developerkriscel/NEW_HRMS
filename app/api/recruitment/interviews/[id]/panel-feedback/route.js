export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId, ApiError } from '@/lib/auth'
import { canManageInterviews } from '@/lib/interviewConstants'
import { isPanelMember, canSeeAllFeedback, summarizePanelFeedback } from '@/lib/interviewHelpers'
import Interview from '@/models/Interview'
import InterviewPanelMember from '@/models/InterviewPanelMember'
import InterviewFeedback from '@/models/InterviewFeedback'
import InterviewFeedbackScore from '@/models/InterviewFeedbackScore'

// GET — Panel Feedback Summary (item 16), respecting blind feedback
// (item 14): a plain interviewer who hasn't submitted their own feedback
// yet gets back only submission *status* per panelist, never the content —
// "do not show other interviewers' feedback" before they've given theirs.
// Broad HR roles always see everything, for oversight.
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)

  const interview = await Interview.findOne({ _id: params.id, tenantId, deleted: false })
  if (!interview) throw new ApiError(404, 'Interview not found', 'NOT_FOUND')

  const isMember = await isPanelMember(tenantId, interview._id, session.userId)
  if (!isMember && !canManageInterviews(session)) return fail('You are not on the panel for this interview', 403, 'FORBIDDEN')

  const panel = await InterviewPanelMember.find({ tenantId, interviewId: interview._id }).lean()
  const ownFeedback = await InterviewFeedback.findOne({ tenantId, interviewId: interview._id, interviewerId: session.userId }).lean()
  const hasSubmittedOwn = !!ownFeedback

  const panelStatus = panel.map((p) => ({ employeeId: p.employeeId, name: p.employeeName, role: p.role, feedbackStatus: p.feedbackStatus }))

  if (!canSeeAllFeedback(session, hasSubmittedOwn)) {
    return ok({ blind: true, ownFeedback, panelStatus, feedback: [], summary: null })
  }

  const allFeedback = await InterviewFeedback.find({ tenantId, interviewId: interview._id }).sort({ submittedAt: 1 }).lean()
  const scores = await InterviewFeedbackScore.find({ tenantId, feedbackId: { $in: allFeedback.map((f) => f._id) } }).lean()
  const scoresByFeedback = new Map()
  for (const s of scores) {
    const key = String(s.feedbackId)
    if (!scoresByFeedback.has(key)) scoresByFeedback.set(key, [])
    scoresByFeedback.get(key).push(s)
  }

  return ok({
    blind: false,
    panelStatus,
    feedback: allFeedback.map((f) => ({ ...f, scores: scoresByFeedback.get(String(f._id)) || [] })),
    summary: summarizePanelFeedback(allFeedback),
  })
})
