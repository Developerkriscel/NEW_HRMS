export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import {
  COMPENSATION_VIEW_ROLES, canManageCompensation, canViewCompensation, COMPENSATION_STATUS, computeBudgetFit,
} from '@/lib/compensationConstants'
import { ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import { computeTotalCtc, computeIncreaseAnalysis, getLatestProposal } from '@/lib/compensationHelpers'
import Application from '@/models/Application'
import Job from '@/models/Job'
import Candidate from '@/models/Candidate'
import CompensationProposal from '@/models/CompensationProposal'
import SalaryStructure from '@/models/SalaryStructure'

// GET — the latest proposal (any status) for this application, plus its
// full version history and the budget/increase analysis the Compensation
// Proposal form needs. Gated by canViewCompensation, not the broader
// candidate-view roles — item 14's confidentiality boundary.
export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, COMPENSATION_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false }).populate('candidateId').populate('jobId')
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')
  if (!canViewCompensation(session, application.jobId)) return fail('You do not have permission to view compensation for this application', 403, 'FORBIDDEN')

  const [latest, history] = await Promise.all([
    getLatestProposal(tenantId, application._id),
    CompensationProposal.find({ tenantId, applicationId: application._id, deleted: false }).sort({ version: -1 }).lean(),
  ])

  const budgetFit = latest ? computeBudgetFit(latest.totalCtc, latest.budgetMin, latest.budgetMax) : null
  const increase = latest ? computeIncreaseAnalysis(latest.currentCtc, latest.expectedCtc, latest.totalCtc) : null

  return ok({
    application: {
      _id: application._id, applicationCode: application.applicationCode,
      candidate: application.candidateId, job: application.jobId, readyForOffer: application.readyForOffer,
    },
    latest, history, budgetFit, increase,
  })
})

// POST { currentCtc?, expectedCtc?, fixedPay, variablePay?, performanceBonus?, joiningBonus?,
//        retentionBonus?, allowances?, benefits?, salaryStructureId? }
// Creates the next proposal version — unless the latest one is still an
// untouched DRAFT, in which case this just updates it in place (nothing has
// been decided on it yet, so there's nothing to preserve a version of).
// Anything that has moved past DRAFT (submitted, rejected, revision-
// requested, approved) is never overwritten — item 10.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, COMPENSATION_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageCompensation(session)) return fail('You do not have permission to prepare compensation', 403, 'FORBIDDEN')
  if (body.fixedPay == null || Number(body.fixedPay) <= 0) return fail('Fixed Annual Salary is required', 400, 'VALIDATION_ERROR')

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  const job = await Job.findOne({ _id: application.jobId, tenantId, deleted: false })
  const candidate = await Candidate.findOne({ _id: application.candidateId, tenantId, deleted: false })

  const totalCtc = computeTotalCtc(body)
  const fields = {
    currentCtc: body.currentCtc ?? candidate?.currentCtc ?? null,
    expectedCtc: body.expectedCtc ?? candidate?.expectedCtc ?? null,
    fixedPay: Number(body.fixedPay) || 0,
    variablePay: Number(body.variablePay) || 0,
    performanceBonus: Number(body.performanceBonus) || 0,
    joiningBonus: Number(body.joiningBonus) || 0,
    retentionBonus: Number(body.retentionBonus) || 0,
    allowances: Number(body.allowances) || 0,
    benefits: Number(body.benefits) || 0,
    totalCtc,
    budgetMin: job?.internalMinCtc ?? null,
    budgetMax: job?.internalMaxCtc ?? null,
  }
  const fit = computeBudgetFit(totalCtc, fields.budgetMin, fields.budgetMax)
  fields.budgetVariance = fit.variance
  fields.budgetVariancePercent = fit.variancePercent

  let salaryStructureName = null
  if (body.salaryStructureId) {
    const structure = await SalaryStructure.findOne({ _id: body.salaryStructureId, tenantId, deleted: false }).select('name')
    salaryStructureName = structure?.name || null
  }

  const actorName = await getActorName(session)
  const latest = await getLatestProposal(tenantId, application._id)

  let proposal
  if (latest && latest.status === COMPENSATION_STATUS.DRAFT) {
    Object.assign(latest, fields, { salaryStructureId: body.salaryStructureId || null, salaryStructureName })
    await latest.save()
    proposal = latest
  } else {
    proposal = await CompensationProposal.create({
      tenantId,
      applicationId: application._id, candidateId: application.candidateId, jobId: application.jobId,
      version: (latest?.version || 0) + 1,
      supersedes: latest?._id || null,
      ...fields,
      salaryStructureId: body.salaryStructureId || null, salaryStructureName,
      status: COMPENSATION_STATUS.DRAFT,
      createdBy: session.userId, createdByName: actorName,
    })
    application.activityLog.push({ type: ACTIVITY_ENTRY_TYPE.UPDATED, message: `Compensation proposal V${proposal.version} prepared by ${actorName}`, actorName })
    await application.save()
  }

  await logAction(session, { action: 'COMPENSATION_PROPOSED', entityType: 'CompensationProposal', entityId: proposal._id, description: `Compensation proposal V${proposal.version} for ${application.applicationCode}`, req })

  return ok(proposal, 'Compensation proposal saved')
})
