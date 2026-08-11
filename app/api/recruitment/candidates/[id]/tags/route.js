export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { CANDIDATE_VIEW_ROLES, CANDIDATE_MANAGE_ROLES } from '@/lib/candidateConstants'
import Candidate from '@/models/Candidate'
import CandidateTag from '@/models/CandidateTag'
import CandidateTagAssignment from '@/models/CandidateTagAssignment'

// GET — this candidate's assigned tags.
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const assignments = await CandidateTagAssignment.find({ tenantId, candidateId: params.id }).populate('tagId', 'name')
  return ok(assignments.filter((a) => a.tagId).map((a) => ({ assignmentId: a._id, _id: a.tagId._id, name: a.tagId.name })))
})

// POST { name } — assigns a tag by name, creating it first if it's new.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const name = body.name?.trim()
  if (!name) return fail('Tag name is required', 400, 'VALIDATION_ERROR')

  const candidate = await Candidate.findOne({ _id: params.id, tenantId, deleted: false }).select('_id')
  if (!candidate) throw new ApiError(404, 'Candidate not found', 'NOT_FOUND')

  const tag = await CandidateTag.findOneAndUpdate(
    { tenantId, name: { $regex: `^${name}$`, $options: 'i' } },
    { $setOnInsert: { tenantId, name, createdBy: session.sub } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  await CandidateTagAssignment.updateOne(
    { tenantId, candidateId: candidate._id, tagId: tag._id },
    { $setOnInsert: { tenantId, candidateId: candidate._id, tagId: tag._id, assignedBy: session.sub } },
    { upsert: true }
  )
  return ok(tag, 'Tag assigned', 201)
})
