// Step 11 — Final Selection & Hiring Decision. Shared server-side helpers,
// same shape as lib/pipelineHelpers.js / lib/interviewHelpers.js.
import { SELECTION_APPROVAL_LEVEL, SELECTION_STATUS } from './selectionConstants'
import { COMPENSATION_APPROVAL_LEVEL } from './compensationConstants'
import RecruitmentSettings from '@/models/RecruitmentSettings'
import Application from '@/models/Application'
import Interview from '@/models/Interview'
import InterviewFeedback from '@/models/InterviewFeedback'
import CandidateAssessment from '@/models/CandidateAssessment'
import CandidateJobMatch from '@/models/CandidateJobMatch'

// One settings row per tenant — auto-created with the "no approval, do
// nothing extra" defaults the first time anyone asks for it, so every
// tenant works out of the box without an onboarding wizard step (item 3:
// "do not hard-code one workflow for every tenant").
export async function getRecruitmentSettings(tenantId) {
  let settings = await RecruitmentSettings.findOne({ tenantId, deleted: false })
  if (!settings) {
    settings = await RecruitmentSettings.create({
      tenantId,
      selectionApprovalLevel: SELECTION_APPROVAL_LEVEL.NONE,
      compensationApprovalLevel: COMPENSATION_APPROVAL_LEVEL.HIRING_MANAGER,
    })
  }
  return settings
}

// Item 8's Vacancy Check — a warning, never a block ("companies sometimes
// deliberately keep backup candidates"). "Active selected" = applications
// this job has already decided to move forward with but who haven't been
// hired yet (SELECTED / pending or approved selection approval).
const ACTIVE_SELECTED_STATUSES = [
  SELECTION_STATUS.SELECTED, SELECTION_STATUS.SELECTION_APPROVAL_PENDING, SELECTION_STATUS.SELECTION_APPROVED,
]

export async function computeVacancyStatus(job, tenantId, { excludeApplicationId } = {}) {
  const query = { tenantId, jobId: job._id, deleted: false, selectionStatus: { $in: ACTIVE_SELECTED_STATUSES } }
  if (excludeApplicationId) query._id = { $ne: excludeApplicationId }
  const activeSelectedCount = await Application.countDocuments(query)

  const totalOpenings = job.totalOpenings ?? 1
  const filledOpenings = job.filledOpenings ?? 0
  const remainingOpenings = Math.max(0, totalOpenings - filledOpenings - activeSelectedCount)
  const wouldOverSelect = filledOpenings + activeSelectedCount >= totalOpenings

  return {
    totalOpenings, filledOpenings, activeSelectedCount, remainingOpenings,
    wouldOverSelect,
    warning: wouldOverSelect
      ? `This job has ${totalOpenings} opening${totalOpenings === 1 ? '' : 's'}, ${filledOpenings} already joined and ${activeSelectedCount} candidate${activeSelectedCount === 1 ? '' : 's'} already selected. Selecting another candidate will exceed the approved headcount — proceed only if this is an intentional backup.`
      : null,
  }
}

// Final Interview Score — average of every interviewer's overallRating
// across every COMPLETED interview round for this application. Advisory
// only, same spirit as the existing Panel Feedback Summary — never an
// auto-decision.
export async function getFinalInterviewScore(tenantId, applicationId) {
  const interviews = await Interview.find({ tenantId, applicationId, deleted: false }).select('_id status').lean()
  if (!interviews.length) return null
  const feedback = await InterviewFeedback.find({ tenantId, interviewId: { $in: interviews.map((i) => i._id) } }).lean()
  if (!feedback.length) return null
  return Math.round((feedback.reduce((sum, f) => sum + f.overallRating, 0) / feedback.length) * 10) / 10
}

// Latest completed assessment attempt's percentage score for this
// application — mirrors "Assessment Score" as shown elsewhere in the module.
export async function getAssessmentScore(tenantId, applicationId) {
  const latest = await CandidateAssessment.findOne({ tenantId, applicationId, deleted: false, percentage: { $ne: null } })
    .sort({ submittedAt: -1 })
    .select('percentage result')
    .lean()
  return latest ? { percentage: latest.percentage, result: latest.result } : null
}

export async function getAiMatch(tenantId, applicationId) {
  const match = await CandidateJobMatch.findOne({ tenantId, applicationId }).sort({ generatedAt: -1 }).select('overallScore matchLabel').lean()
  return match ? { overallScore: match.overallScore, matchLabel: match.matchLabel } : null
}

// Consolidated Hiring Summary — everything the Selection Decision page
// needs in one call: candidate/job, assessment, AI match, interview rounds +
// panel feedback, expected/current CTC, notice period, vacancy status.
// Compensation is deliberately NOT included here — item 14's confidentiality
// boundary means the compensation card loads from its own, more tightly
// gated endpoint (see lib/compensationHelpers.js).
export async function buildSelectionSummary(application, tenantId) {
  const job = application.jobId // already populated by the caller
  const [interviews, assessmentScore, match, vacancy] = await Promise.all([
    Interview.find({ tenantId, applicationId: application._id, deleted: false }).sort({ date: -1 }).lean(),
    getAssessmentScore(tenantId, application._id),
    getAiMatch(tenantId, application._id),
    job ? computeVacancyStatus(job, tenantId, { excludeApplicationId: application._id }) : null,
  ])

  const feedback = interviews.length
    ? await InterviewFeedback.find({ tenantId, interviewId: { $in: interviews.map((i) => i._id) } }).lean()
    : []
  const feedbackByInterview = new Map()
  for (const f of feedback) {
    const key = String(f.interviewId)
    if (!feedbackByInterview.has(key)) feedbackByInterview.set(key, [])
    feedbackByInterview.get(key).push(f)
  }
  const rounds = interviews.map((i) => ({
    ...i,
    feedback: feedbackByInterview.get(String(i._id)) || [],
  }))
  const finalInterviewScore = feedback.length
    ? Math.round((feedback.reduce((sum, f) => sum + f.overallRating, 0) / feedback.length) * 10) / 10
    : null

  return {
    assessmentScore,
    aiMatch: match,
    interviewRounds: rounds,
    finalInterviewScore,
    vacancy,
  }
}
