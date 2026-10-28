export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_VIEW_ROLES, CANDIDATE_MANAGE_ROLES } from '@/lib/candidateConstants'
import { STAGE_HISTORY_ACTION } from '@/lib/pipelineConstants'
import { generateCandidateCode, findExistingCandidate } from '@/lib/candidateHelpers'
import { claimDraftResume } from '@/lib/candidateProfileHelpers'
import Candidate from '@/models/Candidate'
import CandidateResume from '@/models/CandidateResume'
import Application from '@/models/Application'
import ApplicationStageHistory from '@/models/ApplicationStageHistory'
import CandidateJobMatch from '@/models/CandidateJobMatch'
import CandidateTagAssignment from '@/models/CandidateTagAssignment'
import CandidateTag from '@/models/CandidateTag'
import JobPipelineStage from '@/models/JobPipelineStage'
import Offer from '@/models/Offer'
import SelectionDecision from '@/models/SelectionDecision'
import Interview from '@/models/Interview'
import InterviewPanelMember from '@/models/InterviewPanelMember'
import '@/models/CandidateTag'
import Job from '@/models/Job'

// Application-centric on purpose — the HR Candidates table is really "one
// row per application" (a candidate with two applications shows up twice,
// once per job), matching the spec's own example table exactly. The
// underlying Candidate Master is still a separate collection — see
// GET /api/recruitment/candidates/:id for the candidate-grouped view.
export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const { searchParams } = new URL(req.url)
  const page = Math.max(0, Number(searchParams.get('page') || 0))
  const size = Math.min(100, Math.max(1, Number(searchParams.get('size') || 20)))
  const job = searchParams.get('job')
  const source = searchParams.get('source')
  const status = searchParams.get('status')
  const search = searchParams.get('search')
  const stage = searchParams.get('stage')
  const recruiter = searchParams.get('recruiter')
  const experienceMin = searchParams.get('experienceMin')
  const noticePeriodMax = searchParams.get('noticePeriodMax')
  const expectedCtcMax = searchParams.get('expectedCtcMax')
  const aiMatchMin = searchParams.get('aiMatchMin')
  const tag = searchParams.get('tag')
  const openPositionsOnly = searchParams.get('openPositionsOnly') === 'true'

  const query = { tenantId, deleted: false }
  if (job) query.jobId = job
  if (openPositionsOnly) {
    // The HR positions page treats draft, paused, and legacy ON_HOLD jobs as
    // visible open-position records until they are explicitly closed or
    // cancelled. Keep this filter consistent with that page so candidates do
    // not disappear from the all-candidates table.
    const openJobs = await Job.find({
      tenantId,
      deleted: false,
      status: { $in: ['DRAFT', 'OPEN', 'ACTIVE', 'PAUSED', 'ON_HOLD'] },
    }).select('_id').lean()
    query.jobId = { $in: openJobs.map((item) => item._id) }
  }
  if (source) query.source = source
  if (status) query.status = status
  if (stage) query.currentStageName = stage
  if (recruiter) query.assignedRecruiterId = recruiter

  // Both `tag` and `search` narrow down to a candidateId set — intersect
  // rather than letting the second overwrite the first.
  const candidateIdConstraints = []
  if (tag) {
    const matchingTag = await CandidateTag.findOne({ tenantId, name: { $regex: `^${tag}$`, $options: 'i' } }).select('_id').lean()
    const tagged = matchingTag
      ? await CandidateTagAssignment.find({ tenantId, tagId: matchingTag._id }).select('candidateId').lean()
      : []
    candidateIdConstraints.push(tagged.map((t) => String(t.candidateId)))
  }
  if (search) {
    const matchingCandidates = await Candidate.find({
      tenantId, deleted: false,
      $or: [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { candidateCode: { $regex: search, $options: 'i' } },
      ],
    }).select('_id')
    candidateIdConstraints.push(matchingCandidates.map((c) => String(c._id)))
  }
  if (candidateIdConstraints.length) {
    const [first, ...rest] = candidateIdConstraints
    const intersected = rest.reduce((acc, ids) => acc.filter((id) => ids.includes(id)), first)
    query.candidateId = { $in: intersected }
  }

  // Push candidate and match filters into MongoDB before pagination. The old
  // implementation loaded every application, populated every candidate, and
  // only then filtered in JavaScript, which made large tenants progressively
  // slower and made pagination ineffective.
  const candidateFilter = { tenantId, deleted: false, $and: [] }
  if (experienceMin && Number.isFinite(Number(experienceMin))) {
    candidateFilter.$and.push({ totalExperience: { $gte: Number(experienceMin) } })
  }
  if (expectedCtcMax && Number.isFinite(Number(expectedCtcMax))) {
    candidateFilter.$and.push({
      $or: [
        { expectedCtc: { $lte: Number(expectedCtcMax) } },
        { expectedCtc: null },
        { expectedCtc: { $exists: false } },
      ],
    })
  }
  if (noticePeriodMax && Number.isFinite(Number(noticePeriodMax))) {
    const maxNotice = Number(noticePeriodMax)
    const noticeDays = { $convert: { input: '$noticePeriod', to: 'double', onError: null, onNull: null } }
    candidateFilter.$and.push({
      $expr: {
        $or: [
          { $eq: [noticeDays, null] },
          { $lte: [noticeDays, maxNotice] },
        ],
      },
    })
  }
  if (!candidateFilter.$and.length) delete candidateFilter.$and

  if (candidateFilter.$and) {
    const filteredCandidateIds = await Candidate.find(candidateFilter).select('_id').lean()
    const filteredIds = filteredCandidateIds.map((candidate) => String(candidate._id))
    const existingIds = query.candidateId?.$in?.map((candidateId) => String(candidateId))
    query.candidateId = {
      $in: existingIds
        ? existingIds.filter((candidateId) => filteredIds.includes(candidateId))
        : filteredCandidateIds.map((candidate) => candidate._id),
    }
  }
  if (aiMatchMin && Number.isFinite(Number(aiMatchMin))) {
    const matchingApplicationIds = await CandidateJobMatch.find({
      tenantId,
      $or: [
        { overallScore: { $gte: Number(aiMatchMin) } },
        { aiMatchScore: { $gte: Number(aiMatchMin) } },
      ],
    }).distinct('applicationId')
    query._id = { $in: matchingApplicationIds }
  }

  const [totalElements, applications] = await Promise.all([
    Application.countDocuments(query),
    Application.find(query)
      .select('applicationCode candidateId jobId source appliedAt stageEnteredAt currentStage currentStageName status selectionStatus readyForOffer assignedRecruiterId')
    .populate('candidateId', 'candidateCode firstName lastName email phone totalExperience expectedCtc noticePeriod resumeUrl')
      .populate('jobId', 'jobCode jobTitle publicTitle department location workMode')
      .sort({ appliedAt: -1, _id: -1 })
      .skip(page * size)
      .limit(size)
      .lean(),
  ])
  const pageApplications = applications.filter((a) => a.candidateId && a.jobId)
  // Avoid five extra collection reads when a position has no applications.
  // This is the common first-load path for a new opening.
  if (!pageApplications.length) return ok(paged([], page, size, totalElements))

  const matches = await CandidateJobMatch.find({ tenantId, applicationId: { $in: pageApplications.map((a) => a._id) } })
    .select('applicationId overallScore aiMatchScore aiMatchReasoning summary matchLabel')
    .lean()
  const matchByApplication = new Map(matches.map((m) => [String(m.applicationId), m]))
  const stageIds = pageApplications.map((application) => application.currentStage).filter(Boolean)
  const stages = await JobPipelineStage.find({ tenantId, _id: { $in: stageIds } }).select('_id category').lean()
  const stageCategoryById = new Map(stages.map((stage) => [String(stage._id), stage.category]))

  const pageApplicationIds = pageApplications.map((a) => a._id)
  const pageCandidateIds = pageApplications.map((application) => application.candidateId._id)
  const [offers, interviews, stageHistoryGroups, selectionDecisions, resumes] = await Promise.all([
    Offer.find({
      tenantId,
      applicationId: { $in: pageApplicationIds },
      deleted: false,
    }).select('_id applicationId status sentAt acceptedAt declinedAt expiresAt').lean(),
    Interview.find({
      tenantId,
      applicationId: { $in: pageApplicationIds },
      deleted: false,
      status: { $in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'IN_PROGRESS', 'FEEDBACK_PENDING'] },
    })
      .select('_id applicationId roundName type date startTime endTime timezone mode status meetingUrl location')
      .sort({ date: -1, startTime: -1 })
      .lean(),
    ApplicationStageHistory.aggregate([
      { $match: { tenantId, applicationId: { $in: pageApplicationIds } } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: '$applicationId',
          rows: {
            $push: {
              action: '$action',
              toStageName: '$toStageName',
              createdAt: '$createdAt',
            },
          },
        },
      },
      { $project: { _id: 0, applicationId: '$_id', rows: { $slice: ['$rows', 30] } } },
    ]),
    SelectionDecision.find({
      tenantId,
      applicationId: { $in: pageApplicationIds },
      decision: 'SELECT',
    }).sort({ decidedAt: 1 }).select('applicationId decidedAt approvalStatus').lean(),
    CandidateResume.aggregate([
      { $match: { tenantId, candidateId: { $in: pageCandidateIds } } },
      { $sort: { isPrimary: -1, version: -1, createdAt: -1 } },
      { $group: { _id: '$candidateId', resume: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$resume' } },
      { $project: { candidateId: 1, fileUrl: 1, originalFileName: 1, fileName: 1, isPrimary: 1, version: 1 } },
    ]),
  ])
  const panelMembers = interviews.length
    ? await InterviewPanelMember.find({
      tenantId,
      interviewId: { $in: interviews.map((interview) => interview._id) },
    }).select('interviewId employeeId employeeName role assignmentStatus respondedAt').lean()
    : []
  const panelByInterview = new Map()
  for (const member of panelMembers) {
    const key = String(member.interviewId)
    if (!panelByInterview.has(key)) panelByInterview.set(key, [])
    panelByInterview.get(key).push({
      employeeId: member.employeeId,
      name: member.employeeName,
      role: member.role,
      assignmentStatus: member.assignmentStatus,
      respondedAt: member.respondedAt,
    })
  }
  const stageHistory = stageHistoryGroups.flatMap((group) => (
    group.rows || []).map((row) => ({ applicationId: group.applicationId, ...row }))
  )
  const offerByApplication = new Map(offers.map((offer) => [String(offer.applicationId), offer]))
  const latestInterviewByApplication = new Map()
  for (const interview of interviews) {
    const key = String(interview.applicationId)
    if (!latestInterviewByApplication.has(key)) latestInterviewByApplication.set(key, interview)
  }
  const shortlistedAtByApplication = new Map()
  const interviewStageAtByApplication = new Map()
  for (const history of stageHistory) {
    const key = String(history.applicationId)
    const stageName = String(history.toStageName || '').toLowerCase()
    if (!shortlistedAtByApplication.has(key) && (
      history.action === STAGE_HISTORY_ACTION.SHORTLISTED || /shortlist/i.test(stageName)
    )) {
      shortlistedAtByApplication.set(key, history.createdAt)
    }
    if (!interviewStageAtByApplication.has(key) && /interview|round/i.test(stageName)) {
      interviewStageAtByApplication.set(key, history.createdAt)
    }
  }
  const selectedAtByApplication = new Map()
  for (const decision of selectionDecisions) {
    const key = String(decision.applicationId)
    if (!selectedAtByApplication.has(key) && ['SELECTED', 'APPROVED', 'NOT_REQUIRED'].includes(decision.approvalStatus || 'NOT_REQUIRED')) {
      selectedAtByApplication.set(key, decision.decidedAt)
    }
  }
  const resumeByCandidate = new Map()
  for (const resume of resumes) {
    const key = String(resume.candidateId)
    if (!resumeByCandidate.has(key)) resumeByCandidate.set(key, resume)
  }

  const rows = pageApplications
    .map((a) => {
      const match = matchByApplication.get(String(a._id))
      const offer = offerByApplication.get(String(a._id))
      const interview = latestInterviewByApplication.get(String(a._id))
      const shortlistedAt = shortlistedAtByApplication.get(String(a._id))
      const storedStageCategory = stageCategoryById.get(String(a.currentStage)) || null
      const lifecycleStageCategory = offer?.status === 'ACCEPTED' || a.status === 'HIRED'
        ? 'HIRED'
        : ['SENT', 'VIEWED'].includes(offer?.status)
          ? 'OFFER'
          : storedStageCategory
      const lifecycleStageName = lifecycleStageCategory === 'HIRED'
        ? 'Hired'
        : lifecycleStageCategory === 'OFFER'
          ? 'Offered'
          : a.currentStageName
      return {
        applicationId: a._id,
        applicationCode: a.applicationCode,
        candidateId: a.candidateId._id,
        candidateCode: a.candidateId.candidateCode,
        candidateName: [a.candidateId.firstName, a.candidateId.lastName].filter(Boolean).join(' ').trim(),
        email: a.candidateId.email,
        phone: a.candidateId.phone,
        resumeUrl: resumeByCandidate.get(String(a.candidateId._id))?.fileUrl || a.candidateId.resumeUrl || null,
        jobId: a.jobId._id,
        jobCode: a.jobId.jobCode,
        jobTitle: a.jobId.publicTitle || a.jobId.jobTitle,
        jobDepartment: a.jobId.department,
        jobLocation: a.jobId.location,
        jobWorkMode: a.jobId.workMode,
        experience: a.candidateId.totalExperience,
        expectedCtc: a.candidateId.expectedCtc,
        noticePeriod: a.candidateId.noticePeriod,
        source: a.source,
        appliedAt: a.appliedAt,
        stageEnteredAt: a.stageEnteredAt,
        shortlistedAt: shortlistedAt || (String(a.currentStageName || '').toLowerCase().includes('shortlist') ? a.stageEnteredAt : null),
        interviewStageAt: interviewStageAtByApplication.get(String(a._id)) || null,
        stage: lifecycleStageName,
        stageId: a.currentStage || null,
        stageCategory: lifecycleStageCategory,
        status: a.status,
        selectionStatus: a.selectionStatus,
        readyForOffer: a.readyForOffer,
        offerId: offer?._id || null,
        offerStatus: offer?.status || null,
        offerSentAt: offer?.sentAt || null,
        offerAcceptedAt: offer?.acceptedAt || null,
        offerDeclinedAt: offer?.declinedAt || null,
        offerExpiresAt: offer?.expiresAt || null,
        selectedAt: ['SELECTED', 'SELECTION_APPROVED'].includes(a.selectionStatus)
          ? selectedAtByApplication.get(String(a._id)) || a.stageEnteredAt || null
          : null,
        latestInterview: interview ? {
          interviewId: interview._id,
          roundName: interview.roundName,
          type: interview.type,
          date: interview.date,
          startTime: interview.startTime,
          endTime: interview.endTime,
          timezone: interview.timezone,
          mode: interview.mode,
          status: interview.status,
          meetingUrl: interview.meetingUrl,
          location: interview.location,
          panel: panelByInterview.get(String(interview._id)) || [],
        } : null,
        assignedRecruiterId: a.assignedRecruiterId,
        aiMatchScore: match?.aiMatchScore ?? match?.overallScore ?? null,
        aiMatchReasoning: match?.aiMatchReasoning ?? match?.summary ?? null,
        matchLabel: match?.matchLabel ?? null,
      }
    })

  return ok(paged(rows, page, size, totalElements))
})

// POST — Manual Candidate Entry (Step 6): "HR -> Add Candidate -> Upload
// Resume -> Parse Resume -> Auto-fill Candidate Form -> HR Reviews -> Save".
// The resume itself is uploaded/parsed beforehand via
// POST /api/recruitment/candidates/resumes/draft; this route creates the
// Candidate record and, if a draftResumeId was supplied, claims that resume
// onto it. No Application is created — a manually-added candidate isn't
// attached to any one job yet, matching how Candidate already models a
// person independent of any application (see models/Candidate.js).
export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!body.firstName?.trim()) return fail('Full name is required', 400, 'VALIDATION_ERROR')
  if (!body.email?.trim()) return fail('Email is required', 400, 'VALIDATION_ERROR')
  if (!body.phone?.trim()) return fail('Phone is required', 400, 'VALIDATION_ERROR')

  const email = body.email.trim().toLowerCase()
  const existing = await findExistingCandidate(Candidate, tenantId, { email, phone: body.phone })
  if (existing) {
    return fail(
      `A candidate with this email/phone already exists (${existing.getFullName()}, ${existing.candidateCode})`,
      409, 'DUPLICATE_CANDIDATE', { existingCandidateId: existing._id }
    )
  }

  const candidateCode = await generateCandidateCode(Candidate, tenantId)
  const candidate = await Candidate.create({
    candidateCode,
    firstName: body.firstName.trim(), lastName: body.lastName?.trim() || '',
    email, phone: body.phone.trim(),
    currentLocation: body.currentLocation || null, currentCompany: body.currentCompany || null, currentDesignation: body.currentDesignation || null,
    educationSummary: body.educationSummary || body.educationText || null,
    totalExperience: body.totalExperience ?? null, relevantExperience: body.relevantExperience ?? null,
    currentCtc: body.currentCtc ?? null, expectedCtc: body.expectedCtc ?? null,
    noticePeriod: body.noticePeriod || null, lastWorkingDate: body.lastWorkingDate || null,
    linkedinUrl: body.linkedinUrl || null, githubUrl: body.githubUrl || null, portfolioUrl: body.portfolioUrl || null,
    skills: Array.isArray(body.skills) ? body.skills.map((skill) => String(skill).trim()).filter(Boolean) : [],
    source: 'MANUAL',
    tenantId,
    createdBy: session.sub,
    activityLog: [{ type: 'CREATED', message: 'Candidate added manually by HR', actorName: session.sub }],
  })

  if (body.draftResumeId) {
    const resume = await claimDraftResume(body.draftResumeId, tenantId, candidate._id)
    if (resume) {
      candidate.resumeUrl = resume.fileUrl
      candidate.activityLog.push({ type: 'RESUME_UPLOADED', message: `Resume attached: ${resume.originalFileName || resume.fileName}`, actorName: session.sub })
      await candidate.save()
    }
  }

  await logAction(session, { action: 'CANDIDATE_CREATED', entityType: 'Candidate', entityId: candidate._id, description: `Candidate ${candidate.candidateCode} added manually`, req })

  return ok(candidate, 'Candidate created', 201)
})
