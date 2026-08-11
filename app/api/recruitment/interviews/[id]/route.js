export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { INTERVIEW_VIEW_ROLES } from '@/lib/interviewConstants'
import Interview from '@/models/Interview'
import InterviewPanelMember from '@/models/InterviewPanelMember'
import InterviewScorecardTemplate from '@/models/InterviewScorecardTemplate'
import InterviewScorecardCriterion from '@/models/InterviewScorecardCriterion'
import InterviewScheduleHistory from '@/models/InterviewScheduleHistory'
import Application from '@/models/Application'
import CandidateJobMatch from '@/models/CandidateJobMatch'
import CandidateAssessment from '@/models/CandidateAssessment'

// GET — Overview/Candidate/Panel/Scorecards/History context in one call.
// Feedback *content* is deliberately not included here — see
// GET /api/recruitment/interviews/:id/panel-feedback, which enforces the
// blind-until-you've-submitted rule this route doesn't need to know about.
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, INTERVIEW_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const interview = await Interview.findOne({ _id: params.id, tenantId, deleted: false })
    .populate('candidateId')
    .populate('jobId', 'jobTitle publicTitle department')
    .populate('applicationId')
  if (!interview) throw new ApiError(404, 'Interview not found', 'NOT_FOUND')

  const [panel, scorecardTemplate, history, application, match, assessments] = await Promise.all([
    InterviewPanelMember.find({ tenantId, interviewId: interview._id }).lean(),
    interview.scorecardTemplateId
      ? InterviewScorecardTemplate.findOne({ _id: interview.scorecardTemplateId, tenantId }).lean()
      : null,
    InterviewScheduleHistory.find({ tenantId, interviewId: interview._id }).sort({ changedAt: 1 }).lean(),
    Application.findOne({ _id: interview.applicationId, tenantId }).select('applicationCode currentStageName status source'),
    CandidateJobMatch.findOne({ tenantId, applicationId: interview.applicationId }).lean(),
    CandidateAssessment.find({ tenantId, applicationId: interview.applicationId, status: { $in: ['COMPLETED', 'SUBMITTED', 'EVALUATING'] } }).lean(),
  ])

  let criteria = []
  if (scorecardTemplate) {
    criteria = await InterviewScorecardCriterion.find({ tenantId, templateId: scorecardTemplate._id }).sort({ order: 1 }).lean()
  }

  return ok({
    ...interview.toObject(),
    panel,
    scorecardTemplate: scorecardTemplate ? { ...scorecardTemplate, criteria } : null,
    history,
    application,
    aiMatch: match ? { overallScore: match.overallScore, matchLabel: match.matchLabel, summary: match.summary } : null,
    assessments: assessments.map((a) => ({ _id: a._id, assessmentId: a.assessmentId, percentage: a.percentage, result: a.result, status: a.status })),
  })
})
