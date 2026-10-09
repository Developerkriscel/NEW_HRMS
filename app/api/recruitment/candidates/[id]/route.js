export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { CANDIDATE_VIEW_ROLES } from '@/lib/candidateConstants'
import Candidate from '@/models/Candidate'
import Application from '@/models/Application'

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const candidate = await Candidate.findOne({ _id: params.id, tenantId, deleted: false })
  if (!candidate) throw new ApiError(404, 'Candidate not found', 'NOT_FOUND')

  const applications = await Application.find({ tenantId, candidateId: candidate._id })
    .populate('jobId', 'jobCode jobTitle publicTitle department status')
    .sort({ appliedAt: -1 })

  return ok({ ...candidate.toObject(), applications })
})

export const PATCH = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const candidate = await Candidate.findOne({ _id: params.id, tenantId, deleted: false })
  if (!candidate) throw new ApiError(404, 'Candidate not found', 'NOT_FOUND')

  // Narrow, HR-editable surface — profile facts a recruiter fills in by
  // hand (status, manual skill tags), not the whole Candidate Master.
  if (body.status !== undefined) candidate.status = body.status
  if (body.skills !== undefined) candidate.skills = body.skills
  if (body.email !== undefined) candidate.email = body.email ? String(body.email).trim() : candidate.email
  if (body.phone !== undefined) candidate.phone = body.phone ? String(body.phone).trim() : candidate.phone
  if (body.firstName !== undefined) candidate.firstName = body.firstName ? String(body.firstName).trim() : candidate.firstName
  if (body.lastName !== undefined) candidate.lastName = body.lastName ? String(body.lastName).trim() : candidate.lastName
  candidate.updatedBy = session.sub
  await candidate.save()

  return ok(candidate, 'Candidate updated')
})
