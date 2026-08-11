// Step 13 — Offer Letter Generation & Approval, Step 14 — Candidate Offer
// Portal + Digital Acceptance. Same pattern as selectionConstants.js /
// compensationConstants.js.
import { CANDIDATE_VIEW_ROLES, CANDIDATE_MANAGE_ROLES } from './candidateConstants'

// Offer-level lifecycle. DRAFT..REVISION_REQUESTED mirror the *current
// version's* internal-approval state; SENT onward are states that only
// exist once an approved version has actually gone out to the candidate.
export const OFFER_STATUS = {
  DRAFT: 'DRAFT', PENDING_APPROVAL: 'PENDING_APPROVAL', APPROVED: 'APPROVED',
  SENT: 'SENT', VIEWED: 'VIEWED', ACCEPTED: 'ACCEPTED', DECLINED: 'DECLINED',
  EXPIRED: 'EXPIRED', WITHDRAWN: 'WITHDRAWN', REVISION_REQUESTED: 'REVISION_REQUESTED',
}
export const OFFER_STATUS_LIST = Object.values(OFFER_STATUS)
export const OFFER_STATUS_LABELS = {
  DRAFT: 'Draft', PENDING_APPROVAL: 'Pending Approval', APPROVED: 'Approved',
  SENT: 'Sent', VIEWED: 'Viewed', ACCEPTED: 'Accepted', DECLINED: 'Declined',
  EXPIRED: 'Expired', WITHDRAWN: 'Withdrawn', REVISION_REQUESTED: 'Revision Requested',
}

// Same per-version status vocabulary as CompensationProposal.status — one
// row per version, never mutated once it leaves DRAFT (item 10, "never
// overwrite an offer").
export const OFFER_VERSION_STATUS = {
  DRAFT: 'DRAFT', PENDING_APPROVAL: 'PENDING_APPROVAL', APPROVED: 'APPROVED',
  REJECTED: 'REJECTED', REVISION_REQUESTED: 'REVISION_REQUESTED',
}
export const OFFER_VERSION_STATUS_LIST = Object.values(OFFER_VERSION_STATUS)

export const OFFER_APPROVAL_STATUS = { PENDING: 'PENDING', APPROVED: 'APPROVED', REJECTED: 'REJECTED', REVISION_REQUESTED: 'REVISION_REQUESTED' }
export const OFFER_APPROVAL_STATUS_LIST = Object.values(OFFER_APPROVAL_STATUS)

// item 5 — starter template categories HR can pick from when creating a
// reusable template; not a closed enum on the template document itself
// (name is freeform), just what the "new template" screen suggests.
export const OFFER_TEMPLATE_CATEGORIES = ['Full-Time Employee', 'Intern', 'Contract Employee', 'Senior Management', 'Remote Employee']

// The exact variable set the spec lists, plus a handful of obviously useful
// extras the auto-fill data already has on hand (kept clearly marked so a
// template author isn't guessing what else is available).
export const OFFER_TEMPLATE_VARIABLES = [
  { key: 'candidate_name', label: 'Candidate Name' },
  { key: 'designation', label: 'Designation' },
  { key: 'department', label: 'Department' },
  { key: 'joining_date', label: 'Joining Date' },
  { key: 'location', label: 'Location' },
  { key: 'reporting_manager', label: 'Reporting Manager' },
  { key: 'annual_ctc', label: 'Annual CTC' },
  { key: 'probation_period', label: 'Probation Period' },
  { key: 'offer_expiry', label: 'Offer Valid Until' },
  { key: 'company_name', label: 'Company Name' },
  // Extras beyond the spec's core list — available, not required.
  { key: 'candidate_id', label: 'Candidate ID' },
  { key: 'employment_type', label: 'Employment Type' },
  { key: 'notice_period', label: 'Notice Period' },
  { key: 'work_mode', label: 'Work Mode' },
]

export const DISCUSSION_REQUEST_STATUS = 'DISCUSSION_REQUESTED' // an informal offer-level flag, not a full status

export const OFFER_DECLINE_REASONS = [
  'Compensation', 'Accepted another offer', 'Location', 'Role mismatch',
  'Joining date', 'Personal reason', 'Other',
]

export const OFFER_CANDIDATE_ACTION = { VIEW: 'VIEW', ACCEPT: 'ACCEPT', DECLINE: 'DECLINE', DISCUSSION_REQUEST: 'DISCUSSION_REQUEST' }
export const OFFER_CANDIDATE_ACTION_LIST = Object.values(OFFER_CANDIDATE_ACTION)

export const OFFER_PERMISSIONS = {
  VIEW: 'offer.view', CREATE: 'offer.create', EDIT: 'offer.edit',
  APPROVE: 'offer.approve', SEND: 'offer.send', WITHDRAW: 'offer.withdraw',
}

// Same broad-vs-narrow split as every other recruitment sub-module.
export const OFFER_VIEW_ROLES = CANDIDATE_VIEW_ROLES
export const OFFER_MANAGE_ROLES = CANDIDATE_MANAGE_ROLES
export function canManageOffers(session) {
  return CANDIDATE_MANAGE_ROLES.includes(session.role)
}

// Single-level approval (no configurable chain like Steps 11/12 — the spec
// doesn't ask for one here): Company Admin / Super Admin always qualify,
// same as everywhere else; the job's specifically-assigned hiring manager
// is also an "Authorized Approver" per the spec's own wording.
export function canApproveOffer(session, job) {
  if (['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(session.role)) return true
  return !!(job?.hiringManager && String(job.hiringManager) === String(session.userId))
}

// item 3 — the exact gate: an offer can only be generated once both prior
// decisions are actually final.
export function isEligibleForOffer(application) {
  return application?.selectionStatus === 'SELECTION_APPROVED' && !!application?.readyForOffer
}
