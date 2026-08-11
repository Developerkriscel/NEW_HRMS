export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { COMPENSATION_VIEW_ROLES, canManageCompensation, canViewCompensation, COMPENSATION_STATUS, computeBudgetFit } from '@/lib/compensationConstants'
import { computeTotalCtc } from '@/lib/compensationHelpers'
import CompensationProposal from '@/models/CompensationProposal'
import Job from '@/models/Job'
import SalaryStructure from '@/models/SalaryStructure'

const EDITABLE_FIELDS = ['currentCtc', 'expectedCtc', 'fixedPay', 'variablePay', 'performanceBonus', 'joiningBonus', 'retentionBonus', 'allowances', 'benefits', 'salaryStructureId']

// GET/PATCH a single proposal by id — PATCH only ever touches a DRAFT (item
// 10's "never overwrite" applies from the moment it's submitted onward).
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, COMPENSATION_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const proposal = await CompensationProposal.findOne({ _id: params.id, tenantId, deleted: false }).populate('jobId')
  if (!proposal) throw new ApiError(404, 'Compensation proposal not found', 'NOT_FOUND')
  if (!canViewCompensation(session, proposal.jobId)) return fail('You do not have permission to view this proposal', 403, 'FORBIDDEN')

  return ok({ ...proposal.toObject(), budgetFit: computeBudgetFit(proposal.totalCtc, proposal.budgetMin, proposal.budgetMax) })
})

export const PATCH = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, COMPENSATION_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageCompensation(session)) return fail('You do not have permission to edit compensation', 403, 'FORBIDDEN')

  const proposal = await CompensationProposal.findOne({ _id: params.id, tenantId, deleted: false })
  if (!proposal) throw new ApiError(404, 'Compensation proposal not found', 'NOT_FOUND')
  if (proposal.status !== COMPENSATION_STATUS.DRAFT) return fail('Only a draft proposal can be edited — create a new version instead', 400, 'INVALID_STATE')

  for (const field of EDITABLE_FIELDS) {
    if (body[field] !== undefined) proposal[field] = field === 'salaryStructureId' ? body[field] : Number(body[field]) || 0
  }
  if (body.salaryStructureId) {
    const structure = await SalaryStructure.findOne({ _id: body.salaryStructureId, tenantId, deleted: false }).select('name')
    proposal.salaryStructureName = structure?.name || null
  }
  proposal.totalCtc = computeTotalCtc(proposal)

  const job = await Job.findOne({ _id: proposal.jobId, tenantId, deleted: false }).select('internalMinCtc internalMaxCtc')
  proposal.budgetMin = job?.internalMinCtc ?? null
  proposal.budgetMax = job?.internalMaxCtc ?? null
  const fit = computeBudgetFit(proposal.totalCtc, proposal.budgetMin, proposal.budgetMax)
  proposal.budgetVariance = fit.variance
  proposal.budgetVariancePercent = fit.variancePercent

  await proposal.save()

  await logAction(session, { action: 'COMPENSATION_UPDATED', entityType: 'CompensationProposal', entityId: proposal._id, description: `Compensation proposal V${proposal.version} updated`, req })

  return ok(proposal, 'Compensation proposal updated')
})
