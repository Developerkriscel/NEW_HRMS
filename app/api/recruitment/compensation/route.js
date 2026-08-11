export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { COMPENSATION_VIEW_ROLES, COMPENSATION_STATUS_LABELS, computeBudgetFit } from '@/lib/compensationConstants'
import CompensationProposal from '@/models/CompensationProposal'

// GET — one row per application showing only its *latest* proposal version
// (the version history is available from the application-scoped endpoint).
// Confidentiality-gated (item 14): the broad recruitment view roles do not
// automatically get this list.
export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, COMPENSATION_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 50)
  const status = searchParams.get('status')

  // Latest version per application: sort desc by version, then dedupe by
  // applicationId keeping the first (highest-version) row seen.
  const all = await CompensationProposal.find({ tenantId, deleted: false })
    .populate('candidateId', 'firstName lastName candidateCode')
    .populate('jobId', 'jobCode jobTitle publicTitle')
    .sort({ version: -1 })

  const seen = new Set()
  let latestPerApplication = []
  for (const p of all) {
    const key = String(p.applicationId)
    if (seen.has(key)) continue
    seen.add(key)
    latestPerApplication.push(p)
  }
  if (status) latestPerApplication = latestPerApplication.filter((p) => p.status === status)
  latestPerApplication.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))

  const totalElements = latestPerApplication.length
  const pageRows = latestPerApplication.slice(page * size, page * size + size)

  const rows = pageRows.map((p) => ({
    proposalId: p._id,
    applicationId: p.applicationId,
    version: p.version,
    candidateId: p.candidateId?._id,
    candidateName: p.candidateId ? `${p.candidateId.firstName} ${p.candidateId.lastName}` : null,
    jobId: p.jobId?._id,
    jobTitle: p.jobId?.publicTitle || p.jobId?.jobTitle,
    currentCtc: p.currentCtc,
    expectedCtc: p.expectedCtc,
    totalCtc: p.totalCtc,
    budgetFit: computeBudgetFit(p.totalCtc, p.budgetMin, p.budgetMax),
    status: p.status,
    statusLabel: COMPENSATION_STATUS_LABELS[p.status] || p.status,
    currentApprovalStage: p.currentApprovalStage,
    updatedAt: p.updatedAt,
  }))

  return ok(paged(rows, page, size, totalElements))
})
