// Step 11 — Final Selection & Hiring Decision.
import { CANDIDATE_VIEW_ROLES, CANDIDATE_MANAGE_ROLES } from './candidateConstants'

export const SELECTION_DECISION_TYPE = { SELECT: 'SELECT', ADDITIONAL_ROUND: 'ADDITIONAL_ROUND', HOLD: 'HOLD', REJECT: 'REJECT' }
export const SELECTION_DECISION_TYPE_LIST = Object.values(SELECTION_DECISION_TYPE)

// item 14 — the full status vocabulary the spec lists. PENDING_DECISION
// through ADDITIONAL_ROUND are what Application.selectionStatus actually
// stores; ON_HOLD/REJECTED/WITHDRAWN are never duplicated there — they're
// already Application.status from Step 8, and the Selections UI reads
// *that* field for those three so there's exactly one source of truth per
// outcome rather than two fields that could disagree.
export const SELECTION_STATUS = {
  PENDING_DECISION: 'PENDING_DECISION', SELECTED: 'SELECTED', SELECTION_APPROVAL_PENDING: 'SELECTION_APPROVAL_PENDING',
  SELECTION_APPROVED: 'SELECTION_APPROVED', SELECTION_REJECTED: 'SELECTION_REJECTED', ADDITIONAL_ROUND: 'ADDITIONAL_ROUND',
}
export const SELECTION_STATUS_LIST = Object.values(SELECTION_STATUS)
export const SELECTION_STATUS_LABELS = {
  PENDING_DECISION: 'Pending Decision', SELECTED: 'Selected', SELECTION_APPROVAL_PENDING: 'Approval Pending',
  SELECTION_APPROVED: 'Selection Approved', SELECTION_REJECTED: 'Selection Rejected', ADDITIONAL_ROUND: 'Additional Round',
  ON_HOLD: 'On Hold', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
}

// item 7 — configurable per tenant, never hard-coded to one workflow.
export const SELECTION_APPROVAL_LEVEL = { NONE: 'NONE', HIRING_MANAGER: 'HIRING_MANAGER', COMPANY_ADMIN: 'COMPANY_ADMIN' }
export const SELECTION_APPROVAL_LEVEL_LIST = Object.values(SELECTION_APPROVAL_LEVEL)
export const SELECTION_APPROVAL_LEVEL_LABELS = { NONE: 'No Approval Required', HIRING_MANAGER: 'Hiring Manager Approval', COMPANY_ADMIN: 'Company Admin Approval' }

export const APPROVAL_STATUS = { NOT_REQUIRED: 'NOT_REQUIRED', PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED' }
export const APPROVAL_STATUS_LIST = Object.values(APPROVAL_STATUS)

// item 9 — hold reason suggestions (the underlying hold endpoint already
// stores free text, from Step 8 — this is just what the Selection Decision
// page's dropdown offers).
export const SELECTION_HOLD_REASONS = [
  'Position temporarily frozen', 'Waiting for another candidate', 'Budget approval pending',
  'Management decision pending', 'Candidate availability', 'Other',
]

// item 5 — Additional Round's interview-type choices, exactly as the spec
// lists them. Deliberately its own small vocabulary rather than reusing
// INTERVIEW_TYPE_LIST (lib/interviewConstants.js) — that enum is what gets
// stored on an actual Interview document (SCREENING/TECHNICAL/MANAGERIAL/
// CULTURAL/FINAL/CUSTOM) and doesn't map 1:1 onto the plainer "why is HR
// sending this candidate back" categories here.
export const ADDITIONAL_ROUND_INTERVIEW_TYPES = ['Technical', 'Manager', 'HR', 'Other']

export const SELECTION_PERMISSIONS = { VIEW: 'selection.view', DECIDE: 'selection.decide', APPROVE: 'selection.approve' }

export const SELECTION_VIEW_ROLES = CANDIDATE_VIEW_ROLES
export const SELECTION_MANAGE_ROLES = CANDIDATE_MANAGE_ROLES
export function canManageSelections(session) {
  return CANDIDATE_MANAGE_ROLES.includes(session.role)
}

// Who may approve a pending selection at a given configured level — an
// admin can always override, since they can already do everything else in
// this module; a plain "Hiring Manager" approval only opens up to the
// specific employee assigned as *that job's* hiring manager, not every
// manager tenant-wide.
export function canApproveSelection(session, level, job) {
  if (['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) return true
  if (level === SELECTION_APPROVAL_LEVEL.HIRING_MANAGER) {
    return session.role === 'HR_MANAGER' || (job?.hiringManager && String(job.hiringManager) === String(session.userId))
  }
  if (level === SELECTION_APPROVAL_LEVEL.COMPANY_ADMIN) return false // admins already covered above
  return false
}
