// Step 12 — Compensation Proposal & Approval. Shared server-side helpers,
// same shape as lib/selectionHelpers.js.
import { COMPENSATION_APPROVAL_CHAIN, COMPENSATION_STATUS, APPROVAL_ACTION_STATUS } from './compensationConstants'
import CompensationProposal from '@/models/CompensationProposal'
import CompensationApproval from '@/models/CompensationApproval'

// Total CTC is always server-computed — never trusted from the client, even
// though the form shows a live running total for HR's convenience.
export function computeTotalCtc(fields) {
  const { fixedPay = 0, variablePay = 0, performanceBonus = 0, joiningBonus = 0, retentionBonus = 0, allowances = 0, benefits = 0 } = fields
  const sum = [fixedPay, variablePay, performanceBonus, joiningBonus, retentionBonus, allowances, benefits]
    .reduce((total, n) => total + (Number(n) || 0), 0)
  return Math.round(sum * 100) / 100
}

// Salary Increase Analysis — "This helps HR negotiate." Both deltas are
// null when there's nothing to compare against (e.g. a fresher with no
// current CTC).
export function computeIncreaseAnalysis(currentCtc, expectedCtc, proposedCtc) {
  const increasePercent = currentCtc ? Math.round(((proposedCtc - currentCtc) / currentCtc) * 1000) / 10 : null
  const expectedDelta = expectedCtc != null ? Math.round((proposedCtc - expectedCtc) * 100) / 100 : null
  const expectedDeltaPercent = expectedCtc ? Math.round(((proposedCtc - expectedCtc) / expectedCtc) * 1000) / 10 : null
  return { increasePercent, expectedDelta, expectedDeltaPercent }
}

// The most recent version of this application's proposal chain (whatever
// its status) — what the UI's "current" card and the versioning history
// both build from. Older versions are still readable individually by id;
// this is only "give me the latest".
export async function getLatestProposal(tenantId, applicationId) {
  return CompensationProposal.findOne({ tenantId, applicationId, deleted: false }).sort({ version: -1 })
}

// Kicks off (or restarts) the approval chain for a proposal that was just
// submitted. NONE resolves to an immediate approval — no chain, no rows.
export async function startApprovalChain(proposal, level, { tenantId, session, actorName }) {
  const chain = COMPENSATION_APPROVAL_CHAIN[level] || []
  if (!chain.length) {
    proposal.status = COMPENSATION_STATUS.APPROVED
    proposal.approvalLevel = level
    proposal.currentApprovalStage = null
    proposal.approvedAt = new Date()
    proposal.approvedBy = session?.userId || null
    proposal.approvedByName = actorName || null
    return
  }

  proposal.status = COMPENSATION_STATUS.PENDING_APPROVAL
  proposal.approvalLevel = level
  proposal.currentApprovalStage = chain[0]
  await CompensationApproval.insertMany(chain.map((stage) => ({
    tenantId, proposalId: proposal._id, approvalLevel: stage, status: APPROVAL_ACTION_STATUS.PENDING,
  })))
}

// Advances the chain after an approve action at the proposal's current
// stage — moves to the next stage, or finalizes APPROVED if that was the
// last one. Returns true when the proposal just became fully APPROVED.
export async function advanceApprovalChain(proposal, { tenantId, session, actorName, comment }) {
  const chain = COMPENSATION_APPROVAL_CHAIN[proposal.approvalLevel] || []
  const currentIndex = chain.indexOf(proposal.currentApprovalStage)

  await CompensationApproval.findOneAndUpdate(
    { tenantId, proposalId: proposal._id, approvalLevel: proposal.currentApprovalStage },
    { status: APPROVAL_ACTION_STATUS.APPROVED, approverId: session?.userId || null, approverName: actorName || null, comment: comment || null, actedAt: new Date() }
  )

  const nextStage = chain[currentIndex + 1]
  if (nextStage) {
    proposal.currentApprovalStage = nextStage
    return false
  }

  proposal.status = COMPENSATION_STATUS.APPROVED
  proposal.currentApprovalStage = null
  proposal.approvedAt = new Date()
  proposal.approvedBy = session?.userId || null
  proposal.approvedByName = actorName || null
  return true
}

export async function recordApprovalAction(proposal, { tenantId, session, actorName, comment, status }) {
  await CompensationApproval.findOneAndUpdate(
    { tenantId, proposalId: proposal._id, approvalLevel: proposal.currentApprovalStage },
    { status, approverId: session?.userId || null, approverName: actorName || null, comment: comment || null, actedAt: new Date() }
  )
}
