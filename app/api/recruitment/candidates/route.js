export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { CANDIDATE_VIEW_ROLES } from '@/lib/candidateConstants'
import Candidate from '@/models/Candidate'
import Application from '@/models/Application'

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

  const query = { tenantId, deleted: false }
  if (job) query.jobId = job
  if (source) query.source = source
  if (status) query.status = status

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
    query.candidateId = { $in: matchingCandidates.map((c) => c._id) }
  }

  const totalElements = await Application.countDocuments(query)
  const applications = await Application.find(query)
    .populate('candidateId')
    .populate('jobId', 'jobCode jobTitle publicTitle department')
    .sort({ appliedAt: -1 })
    .skip(page * size)
    .limit(size)

  const rows = applications
    .filter((a) => a.candidateId && a.jobId) // guard against an orphaned row if either parent was hard-deleted
    .map((a) => ({
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
      source: a.source,
      appliedAt: a.appliedAt,
      stage: a.currentStageName,
      status: a.status,
    }))

  return ok(paged(rows, page, size, totalElements))
})
