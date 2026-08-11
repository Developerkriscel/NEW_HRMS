// Step 12 — Compensation Proposal & Approval. This module is deliberately
// held to stricter access than the rest of recruitment (item 14) — see
// COMPENSATION_VIEW_ROLES and canViewCompensation() below.

export const COMPENSATION_STATUS = {
  DRAFT: 'DRAFT', PENDING_APPROVAL: 'PENDING_APPROVAL', REVISION_REQUESTED: 'REVISION_REQUESTED',
  APPROVED: 'APPROVED', REJECTED: 'REJECTED', WITHDRAWN: 'WITHDRAWN',
}
export const COMPENSATION_STATUS_LIST = Object.values(COMPENSATION_STATUS)
export const COMPENSATION_STATUS_LABELS = {
  DRAFT: 'Draft', PENDING_APPROVAL: 'Pending Approval', REVISION_REQUESTED: 'Revision Requested',
  APPROVED: 'Approved', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
}

// item 7 — configurable, not a rule builder. HIRING_MANAGER_THEN_COMPANY_ADMIN
// is the one two-step chain this version supports; the spec's own
// budget-variance-driven routing ("further than 10% over budget needs
// Finance too") is explicitly deferred ("implement configurable approval
// levels rather than sophisticated rule builder").
export const COMPENSATION_APPROVAL_LEVEL = {
  NONE: 'NONE', HIRING_MANAGER: 'HIRING_MANAGER', COMPANY_ADMIN: 'COMPANY_ADMIN',
  HIRING_MANAGER_THEN_COMPANY_ADMIN: 'HIRING_MANAGER_THEN_COMPANY_ADMIN',
}
export const COMPENSATION_APPROVAL_LEVEL_LIST = Object.values(COMPENSATION_APPROVAL_LEVEL)
export const COMPENSATION_APPROVAL_LEVEL_LABELS = {
  NONE: 'No Approval Required', HIRING_MANAGER: 'Hiring Manager Approval', COMPANY_ADMIN: 'Company Admin Approval',
  HIRING_MANAGER_THEN_COMPANY_ADMIN: 'Hiring Manager, then Company Admin',
}

export const COMPENSATION_APPROVAL_STAGE = { HIRING_MANAGER: 'HIRING_MANAGER', COMPANY_ADMIN: 'COMPANY_ADMIN' }
export const APPROVAL_ACTION_STATUS = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED', REVISION_REQUESTED: 'REVISION_REQUESTED' }

export const COMPENSATION_PERMISSIONS = {
  VIEW: 'compensation.view', CREATE: 'compensation.create', EDIT: 'compensation.edit',
  APPROVE: 'compensation.approve', REJECT: 'compensation.reject',
}

// Deliberately narrower than CANDIDATE_VIEW_ROLES — no blanket MANAGER
// access. A manager only sees compensation for applications on jobs where
// they're specifically the hiring manager (see canViewCompensation).
export const COMPENSATION_VIEW_ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN']
export function canManageCompensation(session) {
  return COMPENSATION_VIEW_ROLES.includes(session.role)
}
export function canViewCompensation(session, job) {
  if (COMPENSATION_VIEW_ROLES.includes(session.role)) return true
  return !!(job?.hiringManager && String(job.hiringManager) === String(session.userId))
}

// Which stages a given approval level actually walks through, in order —
// the single place this chain is defined so submit/approve routing never
// disagrees with itself.
export const COMPENSATION_APPROVAL_CHAIN = {
  NONE: [],
  HIRING_MANAGER: [COMPENSATION_APPROVAL_STAGE.HIRING_MANAGER],
  COMPANY_ADMIN: [COMPENSATION_APPROVAL_STAGE.COMPANY_ADMIN],
  HIRING_MANAGER_THEN_COMPANY_ADMIN: [COMPENSATION_APPROVAL_STAGE.HIRING_MANAGER, COMPENSATION_APPROVAL_STAGE.COMPANY_ADMIN],
}

// Same shape as selectionConstants' canApproveSelection — Company Admin /
// Super Admin can always act (they sit above every chain), a
// HIRING_MANAGER-stage approval additionally opens up to HR Manager or the
// job's specifically-assigned hiring manager.
export function canApproveCompensationStage(session, stage, job) {
  if (['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) return true
  if (stage === COMPENSATION_APPROVAL_STAGE.HIRING_MANAGER) {
    return session.role === 'HR_MANAGER' || !!(job?.hiringManager && String(job.hiringManager) === String(session.userId))
  }
  return false
}

// Budget fit — used both for the on-screen ✓/⚠ and for deciding whether an
// above-budget proposal needs the stronger approval chain.
export function computeBudgetFit(totalCtc, budgetMin, budgetMax) {
  if (budgetMax == null) return { withinBudget: true, variance: 0, variancePercent: 0 }
  if (totalCtc <= budgetMax) return { withinBudget: true, variance: 0, variancePercent: 0 }
  const variance = Math.round((totalCtc - budgetMax) * 100) / 100
  const variancePercent = Math.round((variance / budgetMax) * 1000) / 10
  return { withinBudget: false, variance, variancePercent }
}
