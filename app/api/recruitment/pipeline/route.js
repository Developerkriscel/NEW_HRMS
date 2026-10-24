export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { CANDIDATE_VIEW_ROLES, APPLICATION_STATUS } from '@/lib/candidateConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { computeStageAging } from '@/lib/pipelineHelpers'
import { PIPELINE_STAGE_CATEGORY } from '@/lib/jobConstants'
import { INTERVIEW_STATUS } from '@/lib/interviewConstants'
import { CANDIDATE_ASSESSMENT_STATUS } from '@/lib/assessmentConstants'
import { COMPENSATION_VIEW_ROLES, COMPENSATION_STATUS_LABELS, computeBudgetFit } from '@/lib/compensationConstants'
import Job from '@/models/Job'
import JobPipelineStage from '@/models/JobPipelineStage'
import Application from '@/models/Application'
import ApplicationStageHistory from '@/models/ApplicationStageHistory'
import Candidate from '@/models/Candidate'
import CandidateJobMatch from '@/models/CandidateJobMatch'
import CandidateTagAssignment from '@/models/CandidateTagAssignment'
import Employee from '@/models/Employee'
import Interview from '@/models/Interview'
import CandidateAssessment from '@/models/CandidateAssessment'
import CompensationProposal from '@/models/CompensationProposal'
import Offer from '@/models/Offer'

// GET ?jobId=... — the Kanban board for one job. A specific job is
// required (matches the spec's own "Job: [Backend Developer v]" mock —
// this is a per-job board, not an all-jobs firehose).
export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const { searchParams } = new URL(req.url)
  const jobId = searchParams.get('jobId')
  if (!jobId) return fail('jobId is required', 400, 'VALIDATION_ERROR')
  const page = Math.max(0, Number(searchParams.get('page') || 0))
  const size = Math.min(100, Math.max(1, Number(searchParams.get('size') || 50)))
  const usePagination = searchParams.has('page') || searchParams.has('size')

  const job = await Job.findOne({ _id: jobId, tenantId, deleted: false })
  if (!job) return fail('Job not found', 404, 'NOT_FOUND')

  const stages = await JobPipelineStage.find({ tenantId, jobId, isActive: true }).sort({ order: 1 }).lean()

  const query = { tenantId, jobId, deleted: false, status: { $in: [APPLICATION_STATUS.ACTIVE, APPLICATION_STATUS.ON_HOLD, APPLICATION_STATUS.HIRED] } }

  const recruiterFilter = searchParams.get('recruiter')
  if (recruiterFilter) query.assignedRecruiterId = recruiterFilter
  const sourceFilter = searchParams.get('source')
  if (sourceFilter) query.source = sourceFilter

  const candidateProjection = 'candidateCode firstName lastName email phone totalExperience expectedCtc noticePeriod currentLocation'
  const hasPostFilter = ['experienceMin', 'aiMatchMin', 'tag', 'search', 'location', 'noticePeriodMax']
    .some((name) => searchParams.get(name))
  const applicationQuery = Application.find(query)
    .select('applicationCode candidateId jobId source appliedAt stageEnteredAt currentStage currentStageName status assignedRecruiterId holdUntil')
    .populate('candidateId', candidateProjection)
    .populate('assignedRecruiterId', 'firstName lastName')
    .sort({ appliedAt: -1, _id: -1 })
  if (usePagination && !hasPostFilter) applicationQuery.skip(page * size).limit(size)
  let applications = await applicationQuery.lean()
  let totalElements = hasPostFilter ? null : await Application.countDocuments(query)

  const candidateIds = applications.map((a) => a.candidateId?._id).filter(Boolean)
  const applicationIds = applications.map((a) => a._id)
  const [matches, tagAssignments] = await Promise.all([
    CandidateJobMatch.find({ tenantId, jobId }).lean(),
    CandidateTagAssignment.find({ tenantId, candidateId: { $in: candidateIds } }).populate('tagId', 'name').lean(),
  ])
  const activeOffers = await Offer.find({
    tenantId,
    applicationId: { $in: applicationIds },
    deleted: false,
    status: { $in: ['SENT', 'VIEWED', 'ACCEPTED'] },
  }).select('applicationId status sentAt acceptedAt').lean()
  const offerByApplication = new Map(activeOffers.map((offer) => [String(offer.applicationId), offer]))
  const matchByApplication = new Map(matches.map((m) => [String(m.applicationId), m]))
  const tagsByCandidate = new Map()
  for (const a of tagAssignments) {
    if (!a.tagId) continue
    const key = String(a.candidateId)
    if (!tagsByCandidate.has(key)) tagsByCandidate.set(key, [])
    tagsByCandidate.get(key).push(a.tagId.name)
  }

  // In-memory filters that need the joined data above — kept simple rather
  // than pushed into the Mongo query, this board is one job at a time so
  // the result set is small.
  const experienceMin = searchParams.get('experienceMin')
  const aiMatchMin = searchParams.get('aiMatchMin')
  const tagFilter = searchParams.get('tag')
  const search = searchParams.get('search')?.toLowerCase()
  const locationFilter = searchParams.get('location')?.toLowerCase()
  const noticePeriodMax = searchParams.get('noticePeriodMax')

  applications = applications.filter((a) => {
    const candidate = a.candidateId
    if (!candidate) return false
    if (experienceMin && (candidate.totalExperience ?? -1) < Number(experienceMin)) return false
    if (aiMatchMin) {
      const m = matchByApplication.get(String(a._id))
      if (!m || m.overallScore < Number(aiMatchMin)) return false
    }
    if (tagFilter) {
      const tags = tagsByCandidate.get(String(candidate._id)) || []
      if (!tags.some((t) => t.toLowerCase() === tagFilter.toLowerCase())) return false
    }
    if (locationFilter && !(candidate.currentLocation || '').toLowerCase().includes(locationFilter)) return false
    if (noticePeriodMax) {
      const days = parseInt(candidate.noticePeriod, 10)
      if (Number.isFinite(days) && days > Number(noticePeriodMax)) return false
    }
    if (search) {
      const haystack = `${candidate.firstName} ${candidate.lastName} ${candidate.email} ${candidate.phone} ${candidate.candidateCode} ${a.applicationCode}`.toLowerCase()
      if (!haystack.includes(search)) return false
    }
    return true
  })

  if (totalElements === null) totalElements = applications.length
  if (usePagination && hasPostFilter) applications = applications.slice(page * size, page * size + size)

  const stageMap = new Map(stages.map((s) => [String(s._id), s]))
  const hiredStage = stages.find((stage) => stage.category === PIPELINE_STAGE_CATEGORY.HIRED || /hired/i.test(stage.name || ''))
  const offerStage = stages.find((stage) => stage.category === PIPELINE_STAGE_CATEGORY.OFFER || /offer/i.test(stage.name || ''))

  // Which applications already have a live (non-cancelled) interview booked —
  // used to flag Interview-stage cards that were moved here but never
  // actually got a slot scheduled (see lib/jobConstants.js STAGE_CATEGORY_UNLOCKS).
  const bookedApplicationIds = new Set(
    (await Interview.find({
      tenantId, applicationId: { $in: applications.map((a) => a._id) }, deleted: false, status: { $ne: INTERVIEW_STATUS.CANCELLED },
    }).select('applicationId').lean()).map((i) => String(i.applicationId))
  )

  // Same idea for Assessment-category cards, but richer than a boolean —
  // the panel below the board needs to distinguish "never assigned" from
  // "submitted, waiting on evaluation" from "done, here's the score."
  const assessmentStageAppIds = applications
    .filter((a) => stageMap.get(String(a.currentStage))?.category === PIPELINE_STAGE_CATEGORY.ASSESSMENT)
    .map((a) => a._id)
  const latestAssessmentByApplication = new Map()
  if (assessmentStageAppIds.length) {
    const assessmentDocs = await CandidateAssessment.find({ tenantId, applicationId: { $in: assessmentStageAppIds } })
      .populate('assessmentId', 'name')
      .sort({ createdAt: -1 })
      .lean()
    for (const doc of assessmentDocs) {
      const key = String(doc.applicationId)
      if (!latestAssessmentByApplication.has(key)) latestAssessmentByApplication.set(key, doc) // first = latest, already sorted desc
    }
  }

  // Same idea for Selected-category cards — compensation is confidentiality-
  // gated (see lib/compensationConstants.js), so unlike interviews/
  // assessments this is only ever computed (and sent over the wire) for
  // roles allowed to see it. A Manager viewing this same board just never
  // receives a `compensation` field at all, rather than the UI hiding it.
  const canSeeCompensation = COMPENSATION_VIEW_ROLES.includes(session.role)
  const latestCompensationByApplication = new Map()
  if (canSeeCompensation) {
    const selectedStageAppIds = applications
      .filter((a) => stageMap.get(String(a.currentStage))?.category === PIPELINE_STAGE_CATEGORY.SELECTED)
      .map((a) => a._id)
    if (selectedStageAppIds.length) {
      const proposals = await CompensationProposal.find({ tenantId, applicationId: { $in: selectedStageAppIds }, deleted: false })
        .sort({ version: -1 })
        .lean()
      for (const p of proposals) {
        const key = String(p.applicationId)
        if (!latestCompensationByApplication.has(key)) latestCompensationByApplication.set(key, p) // first = highest version
      }
    }
  }

  const byStage = new Map(stages.map((s) => [String(s._id), []]))
  const unassignedCards = [] // status HIRED or a stray currentStage not in the active list
  const shortlistHistory = await ApplicationStageHistory.find({
    tenantId,
    applicationId: { $in: applications.map((a) => a._id) },
    action: STAGE_HISTORY_ACTION.SHORTLISTED,
  }).sort({ createdAt: 1 }).select('applicationId createdAt').lean()
  const shortlistedAtByApplication = new Map()
  for (const history of shortlistHistory) {
    const key = String(history.applicationId)
    if (!shortlistedAtByApplication.has(key)) shortlistedAtByApplication.set(key, history.createdAt)
  }

  for (const a of applications) {
    const candidate = a.candidateId
    const match = matchByApplication.get(String(a._id))
    const offer = offerByApplication.get(String(a._id))
    const lifecycleStatus = offer?.status === 'ACCEPTED' || a.status === APPLICATION_STATUS.HIRED
      ? APPLICATION_STATUS.HIRED
      : offer && ['SENT', 'VIEWED'].includes(offer.status)
        ? APPLICATION_STATUS.ACTIVE
        : a.status
    const stage = lifecycleStatus === APPLICATION_STATUS.HIRED && hiredStage
      ? hiredStage
      : offer && ['SENT', 'VIEWED'].includes(offer.status) && offerStage
        ? offerStage
        : stageMap.get(String(a.currentStage))
    const aging = computeStageAging(a, stage?.category)
    const latestAssessment = stage?.category === PIPELINE_STAGE_CATEGORY.ASSESSMENT ? latestAssessmentByApplication.get(String(a._id)) : null
    const latestCompensation = stage?.category === PIPELINE_STAGE_CATEGORY.SELECTED ? latestCompensationByApplication.get(String(a._id)) : null

    const card = {
      applicationId: a._id,
      applicationCode: a.applicationCode,
      candidateId: candidate._id,
      candidateCode: candidate.candidateCode,
      candidateName: candidate.getFullName ? candidate.getFullName() : `${candidate.firstName} ${candidate.lastName}`,
      aiMatchScore: match?.aiMatchScore ?? match?.overallScore ?? null,
      aiMatchReasoning: match?.aiMatchReasoning ?? match?.summary ?? null,
      matchLabel: match?.matchLabel ?? null,
      experience: candidate.totalExperience ?? null,
      noticePeriod: candidate.noticePeriod || null,
      source: a.source,
      status: lifecycleStatus,
      offerStatus: offer?.status || null,
      appliedAt: a.appliedAt,
      stageEnteredAt: a.stageEnteredAt,
      shortlistedAt: shortlistedAtByApplication.get(String(a._id)) || null,
      ageDays: aging.ageDays,
      slaDays: aging.slaDays,
      isOverdue: aging.isOverdue,
      overdueDays: aging.overdueDays,
      assignedRecruiterId: a.assignedRecruiterId?._id || null,
      assignedRecruiterName: a.assignedRecruiterId ? `${a.assignedRecruiterId.firstName} ${a.assignedRecruiterId.lastName}` : null,
      tags: tagsByCandidate.get(String(candidate._id)) || [],
      holdUntil: a.holdUntil || null,
      needsScheduling: stage?.category === PIPELINE_STAGE_CATEGORY.INTERVIEW && !bookedApplicationIds.has(String(a._id)),
      // Only populated for Assessment-category cards — see assessmentStageAppIds above.
      assessment: latestAssessment ? {
        candidateAssessmentId: latestAssessment._id,
        assessmentName: latestAssessment.assessmentId?.name || null,
        status: latestAssessment.status,
        percentage: latestAssessment.percentage,
        result: latestAssessment.result,
        needsEvaluation: [CANDIDATE_ASSESSMENT_STATUS.SUBMITTED, CANDIDATE_ASSESSMENT_STATUS.EVALUATING].includes(latestAssessment.status),
      } : null,
      // Only populated for Selected-category cards, and only when canSeeCompensation.
      compensation: latestCompensation ? {
        proposalId: latestCompensation._id,
        status: latestCompensation.status,
        statusLabel: COMPENSATION_STATUS_LABELS[latestCompensation.status] || latestCompensation.status,
        totalCtc: latestCompensation.totalCtc,
        budgetFit: computeBudgetFit(latestCompensation.totalCtc, latestCompensation.budgetMin, latestCompensation.budgetMax),
      } : null,
    }

    // A hired application may still contain its previous Selected/Offer stage
    // for audit purposes. The lifecycle status must route it to Hired so one
    // candidate cannot appear in two terminal lanes.
    const targetStage = stage
    if (targetStage && byStage.has(String(targetStage._id))) byStage.get(String(targetStage._id)).push(card)
    else unassignedCards.push(card)
  }

  const stagesWithCards = stages.map((s) => ({
    ...s,
    cards: (byStage.get(String(s._id)) || []).sort((x, y) => new Date(y.appliedAt) - new Date(x.appliedAt)),
  }))

  const countsByStage = {}
  const avgDaysInStage = {}
  for (const s of stagesWithCards) {
    countsByStage[s._id] = s.cards.length
    avgDaysInStage[s._id] = s.cards.length ? Math.round((s.cards.reduce((sum, c) => sum + c.ageDays, 0) / s.cards.length) * 10) / 10 : 0
  }

  const recruiters = await Employee.find({ tenantId, deleted: false, status: { $ne: 'TERMINATED' } }).select('firstName lastName').sort({ firstName: 1 }).lean()

  return ok({
    job: { _id: job._id, jobCode: job.jobCode, jobTitle: job.jobTitle, publicTitle: job.publicTitle },
    stages: stagesWithCards,
    unassigned: unassignedCards,
    metrics: { totalActive: totalElements, countsByStage, avgDaysInStage },
    pagination: { page, size, totalElements, hasMore: usePagination && (page + 1) * size < totalElements },
    recruiters: recruiters.map((r) => ({ _id: r._id, name: `${r.firstName} ${r.lastName}` })),
  })
})
