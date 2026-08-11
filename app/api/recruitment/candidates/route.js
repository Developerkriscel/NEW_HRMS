export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_VIEW_ROLES, CANDIDATE_MANAGE_ROLES } from '@/lib/candidateConstants'
import { generateCandidateCode, findExistingCandidate } from '@/lib/candidateHelpers'
import { claimDraftResume } from '@/lib/candidateProfileHelpers'
import Candidate from '@/models/Candidate'
import Application from '@/models/Application'
import CandidateJobMatch from '@/models/CandidateJobMatch'
import CandidateTagAssignment from '@/models/CandidateTagAssignment'

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
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 20)
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

  const query = { tenantId, deleted: false }
  if (job) query.jobId = job
  if (source) query.source = source
  if (status) query.status = status
  if (stage) query.currentStageName = stage
  if (recruiter) query.assignedRecruiterId = recruiter

  // Both `tag` and `search` narrow down to a candidateId set — intersect
  // rather than letting the second overwrite the first.
  const candidateIdConstraints = []
  if (tag) {
    const tagged = await CandidateTagAssignment.find({ tenantId }).populate({ path: 'tagId', match: { name: { $regex: `^${tag}$`, $options: 'i' } } }).select('candidateId tagId')
    candidateIdConstraints.push(tagged.filter((t) => t.tagId).map((t) => String(t.candidateId)))
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

  // experienceMin/expectedCtcMax/noticePeriodMax/aiMatchMin all live on
  // Candidate/CandidateJobMatch, not Application, so they're applied as
  // in-memory filters after populating — this list is per-tenant recruiting
  // data, never large enough for that to matter. totalElements below is
  // computed from the fully-filtered set, not the raw query, so pagination
  // stays accurate.
  let applications = await Application.find(query)
    .populate('candidateId')
    .populate('jobId', 'jobCode jobTitle publicTitle department')
    .sort({ appliedAt: -1 })

  applications = applications.filter((a) => a.candidateId && a.jobId)
  if (experienceMin) applications = applications.filter((a) => (a.candidateId.totalExperience ?? -1) >= Number(experienceMin))
  if (expectedCtcMax) applications = applications.filter((a) => (a.candidateId.expectedCtc ?? Infinity) <= Number(expectedCtcMax))
  if (noticePeriodMax) {
    applications = applications.filter((a) => {
      const days = parseInt(a.candidateId.noticePeriod, 10)
      return !Number.isFinite(days) || days <= Number(noticePeriodMax)
    })
  }

  const matches = await CandidateJobMatch.find({ tenantId, applicationId: { $in: applications.map((a) => a._id) } }).lean()
  const matchByApplication = new Map(matches.map((m) => [String(m.applicationId), m]))
  if (aiMatchMin) applications = applications.filter((a) => (matchByApplication.get(String(a._id))?.overallScore ?? -1) >= Number(aiMatchMin))

  const totalElements = applications.length
  const pageApplications = applications.slice(page * size, page * size + size)

  const rows = pageApplications
    .map((a) => {
      const match = matchByApplication.get(String(a._id))
      return {
        applicationId: a._id,
        applicationCode: a.applicationCode,
        candidateId: a.candidateId._id,
        candidateCode: a.candidateId.candidateCode,
        candidateName: a.candidateId.getFullName(),
        email: a.candidateId.email,
        phone: a.candidateId.phone,
        jobId: a.jobId._id,
        jobTitle: a.jobId.publicTitle || a.jobId.jobTitle,
        experience: a.candidateId.totalExperience,
        expectedCtc: a.candidateId.expectedCtc,
        noticePeriod: a.candidateId.noticePeriod,
        source: a.source,
        appliedAt: a.appliedAt,
        stage: a.currentStageName,
        status: a.status,
        assignedRecruiterId: a.assignedRecruiterId,
        aiMatchScore: match?.overallScore ?? null,
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
    totalExperience: body.totalExperience ?? null, relevantExperience: body.relevantExperience ?? null,
    currentCtc: body.currentCtc ?? null, expectedCtc: body.expectedCtc ?? null,
    noticePeriod: body.noticePeriod || null, lastWorkingDate: body.lastWorkingDate || null,
    linkedinUrl: body.linkedinUrl || null, githubUrl: body.githubUrl || null, portfolioUrl: body.portfolioUrl || null,
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
