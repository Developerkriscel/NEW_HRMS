export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { SELECTION_VIEW_ROLES, SELECTION_STATUS_LABELS } from '@/lib/selectionConstants'
import { APPLICATION_STATUS } from '@/lib/candidateConstants'
import Application from '@/models/Application'
import Interview from '@/models/Interview'
import InterviewFeedback from '@/models/InterviewFeedback'
import CandidateAssessment from '@/models/CandidateAssessment'
import CandidateJobMatch from '@/models/CandidateJobMatch'

// A candidate's "reached the final selection stage" is a one-way door —
// selectionStatus, once set by the SELECTED-category stage hook (see
// lib/pipelineHelpers.js), never goes back to null, so this list is every
// candidate who has ever gotten there, including ones now on hold/rejected/
// sent back for another round. The `decision` column merges the two status
// sources: application.status wins when it's a terminal/paused state,
// selectionStatus otherwise.
function mergedDecision(application) {
  if ([APPLICATION_STATUS.ON_HOLD, APPLICATION_STATUS.REJECTED, APPLICATION_STATUS.WITHDRAWN].includes(application.status)) {
    return application.status
  }
  return application.selectionStatus
}

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, SELECTION_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 50)
  const job = searchParams.get('job')
  const decision = searchParams.get('decision')
  const search = searchParams.get('search')

  const query = { tenantId, deleted: false, selectionStatus: { $ne: null } }
  if (job) query.jobId = job

  let applications = await Application.find(query)
    .populate('candidateId', 'firstName lastName candidateCode expectedCtc currentCtc noticePeriod')
    .populate('jobId', 'jobCode jobTitle publicTitle hiringManager totalOpenings filledOpenings')
    .populate({ path: 'jobId', populate: { path: 'hiringManager', select: 'firstName lastName' } })
    .sort({ updatedAt: -1 })

  if (search) {
    const term = search.toLowerCase()
    applications = applications.filter((a) => {
      const name = a.candidateId ? `${a.candidateId.firstName} ${a.candidateId.lastName}`.toLowerCase() : ''
      return name.includes(term) || a.applicationCode?.toLowerCase().includes(term)
    })
  }
  if (decision) applications = applications.filter((a) => mergedDecision(a) === decision)

  const totalElements = applications.length
  const pageApplications = applications.slice(page * size, page * size + size)
  const ids = pageApplications.map((a) => a._id)

  const [interviews, assessments, matches] = await Promise.all([
    Interview.find({ tenantId, applicationId: { $in: ids }, deleted: false }).select('_id applicationId').lean(),
    CandidateAssessment.find({ tenantId, applicationId: { $in: ids }, deleted: false, percentage: { $ne: null } }).sort({ submittedAt: -1 }).select('applicationId percentage').lean(),
    CandidateJobMatch.find({ tenantId, applicationId: { $in: ids } }).sort({ generatedAt: -1 }).select('applicationId overallScore').lean(),
  ])
  const feedback = interviews.length
    ? await InterviewFeedback.find({ tenantId, interviewId: { $in: interviews.map((i) => i._id) } }).select('interviewId overallRating').lean()
    : []
  // Group feedback ratings by applicationId via the interview -> application map.
  const interviewToApp = new Map(interviews.map((i) => [String(i._id), String(i.applicationId)]))
  const ratingsByApp = new Map()
  for (const f of feedback) {
    const appId = interviewToApp.get(String(f.interviewId))
    if (!appId) continue
    if (!ratingsByApp.has(appId)) ratingsByApp.set(appId, [])
    ratingsByApp.get(appId).push(f.overallRating)
  }
  const assessmentByApp = new Map()
  for (const a of assessments) {
    const key = String(a.applicationId)
    if (!assessmentByApp.has(key)) assessmentByApp.set(key, a.percentage) // first hit is most recent, sorted desc
  }
  const matchByApp = new Map()
  for (const m of matches) {
    const key = String(m.applicationId)
    if (!matchByApp.has(key)) matchByApp.set(key, m.overallScore)
  }

  const rows = pageApplications.map((a) => {
    const ratings = ratingsByApp.get(String(a._id))
    return {
      applicationId: a._id,
      applicationCode: a.applicationCode,
      candidateId: a.candidateId?._id,
      candidateName: a.candidateId ? `${a.candidateId.firstName} ${a.candidateId.lastName}` : null,
      jobId: a.jobId?._id,
      jobTitle: a.jobId?.publicTitle || a.jobId?.jobTitle,
      finalInterviewScore: ratings?.length ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : null,
      assessmentScore: assessmentByApp.get(String(a._id)) ?? null,
      aiMatch: matchByApp.get(String(a._id)) ?? null,
      expectedCtc: a.candidateId?.expectedCtc ?? null,
      noticePeriod: a.candidateId?.noticePeriod ?? null,
      hiringManager: a.jobId?.hiringManager ? `${a.jobId.hiringManager.firstName} ${a.jobId.hiringManager.lastName}` : null,
      decision: mergedDecision(a),
      decisionLabel: SELECTION_STATUS_LABELS[mergedDecision(a)] || mergedDecision(a),
      readyForOffer: a.readyForOffer,
    }
  })

  return ok(paged(rows, page, size, totalElements))
})
