export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import {
  INTERVIEW_STATUS, FEEDBACK_STATUS, INTERVIEW_RECOMMENDATION_LIST, canManageInterviews,
} from '@/lib/interviewConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { isPanelMember } from '@/lib/interviewHelpers'
import { getActorName } from '@/lib/candidateHelpers'
import Interview from '@/models/Interview'
import InterviewPanelMember from '@/models/InterviewPanelMember'
import InterviewFeedback from '@/models/InterviewFeedback'
import InterviewFeedbackScore from '@/models/InterviewFeedbackScore'
import Application from '@/models/Application'

// POST { overallRating?, recommendation, strengths?, concerns?, detailedFeedback?, scores?: [{criterionId, criterionName, maxScore, score}] }
// One row per interviewer per interview (upserted). "Do not let
// interviewers submit only free-text feedback" — recommendation is
// required, and if the interview has a scorecard template, its criteria
// scores are expected too.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const interview = await Interview.findOne({ _id: params.id, tenantId, deleted: false })
  if (!interview) throw new ApiError(404, 'Interview not found', 'NOT_FOUND')

  // "Interviewer should only access interviews they're assigned to unless
  // they have broader HR permissions" — this is a *different* access check
  // than the usual role gate, since a panelist's general HRMS role can be
  // anything (EMPLOYEE, MANAGER, ...), not necessarily an HR role.
  const isMember = await isPanelMember(tenantId, interview._id, session.userId)
  if (!isMember && !canManageInterviews(session)) {
    return fail('You are not on the panel for this interview', 403, 'FORBIDDEN')
  }

  if (!body.recommendation || !INTERVIEW_RECOMMENDATION_LIST.includes(body.recommendation)) {
    return fail('A valid recommendation is required', 400, 'VALIDATION_ERROR')
  }

  const scores = Array.isArray(body.scores) ? body.scores.filter((s) => s.criterionName) : []
  const overallRating = body.overallRating != null
    ? Number(body.overallRating)
    : (scores.length ? Math.round((scores.reduce((sum, s) => sum + (s.score / (s.maxScore || 10)) * 10, 0) / scores.length) * 10) / 10 : null)
  if (overallRating == null || Number.isNaN(overallRating)) return fail('An overall rating (or scorecard scores) is required', 400, 'VALIDATION_ERROR')

  const actorName = await getActorName(session)
  const feedback = await InterviewFeedback.findOneAndUpdate(
    { tenantId, interviewId: interview._id, interviewerId: session.userId },
    {
      tenantId, interviewId: interview._id, interviewerId: session.userId, interviewerName: actorName,
      overallRating, recommendation: body.recommendation,
      strengths: body.strengths || null, concerns: body.concerns || null, detailedFeedback: body.detailedFeedback || null,
      submittedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  await InterviewFeedbackScore.deleteMany({ tenantId, feedbackId: feedback._id })
  if (scores.length) {
    await InterviewFeedbackScore.insertMany(scores.map((s) => ({
      tenantId, feedbackId: feedback._id, criterionId: s.criterionId || null, criterionName: s.criterionName, score: s.score, maxScore: s.maxScore || 10,
    })))
  }

  await InterviewPanelMember.updateOne({ tenantId, interviewId: interview._id, employeeId: session.userId }, { feedbackStatus: FEEDBACK_STATUS.SUBMITTED })

  // Auto-promote FEEDBACK_PENDING -> COMPLETED once every panelist is in.
  const panel = await InterviewPanelMember.find({ tenantId, interviewId: interview._id })
  const allSubmitted = panel.length > 0 && panel.every((p) => p.feedbackStatus === FEEDBACK_STATUS.SUBMITTED)
  if (allSubmitted && interview.status === INTERVIEW_STATUS.FEEDBACK_PENDING) {
    interview.status = INTERVIEW_STATUS.COMPLETED
    await interview.save()
  }

  const application = await Application.findOne({ _id: interview.applicationId, tenantId })
  if (application) {
    application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.UPDATED, message: `Feedback submitted by ${actorName} for ${interview.roundName}${allSubmitted ? ' — all panel feedback complete' : ''}`, actorName })
    await application.save()
  }

  await logAction(session, { action: 'INTERVIEW_FEEDBACK_SUBMITTED', entityType: 'Interview', entityId: interview._id, description: `Feedback submitted by ${actorName}`, req })

  return ok({ feedback, interviewStatus: interview.status }, 'Feedback submitted')
})
