// Step 15 — Preboarding Dashboard + Candidate Information Form, Step 16 —
// Document Collection + HR Verification. Same pattern as
// selectionConstants.js / offerConstants.js.
import { CANDIDATE_VIEW_ROLES, CANDIDATE_MANAGE_ROLES } from './candidateConstants'

// Drives which of the 8 dashboard tabs a preboarding candidate shows up
// under — recomputed by lib/preboardingHelpers.js#recomputePreboardingStatus
// every time the form or document state changes, rather than being hand-set
// by any individual route.
export const PREBOARDING_STATUS = {
  ACCEPTED: 'ACCEPTED',
  INFORMATION_PENDING: 'INFORMATION_PENDING',
  DOCUMENTS_PENDING: 'DOCUMENTS_PENDING',
  VERIFICATION_PENDING: 'VERIFICATION_PENDING',
  READY_TO_JOIN: 'READY_TO_JOIN',
  JOINED: 'JOINED',
  NO_SHOW: 'NO_SHOW',
  CANCELLED: 'CANCELLED',
}
export const PREBOARDING_STATUS_LIST = Object.values(PREBOARDING_STATUS)
export const PREBOARDING_STATUS_LABELS = {
  ACCEPTED: 'Accepted Offer', INFORMATION_PENDING: 'Information Pending', DOCUMENTS_PENDING: 'Documents Pending',
  VERIFICATION_PENDING: 'Verification Pending', READY_TO_JOIN: 'Ready to Join', JOINED: 'Joined',
  NO_SHOW: 'No Show', CANCELLED: 'Cancelled',
}
// The dashboard's tab order — deliberately the literal order the spec lists.
export const PREBOARDING_TABS = [
  { key: 'ACCEPTED', label: 'Accepted Offers' },
  { key: 'INFORMATION_PENDING', label: 'Information Pending' },
  { key: 'DOCUMENTS_PENDING', label: 'Documents Pending' },
  { key: 'VERIFICATION_PENDING', label: 'Verification Pending' },
  { key: 'READY_TO_JOIN', label: 'Ready to Join' },
  { key: 'JOINED', label: 'Joined' },
  { key: 'NO_SHOW', label: 'No Show' },
  { key: 'CANCELLED', label: 'Cancelled' },
]

export const FORM_STATUS = {
  NOT_SENT: 'NOT_SENT', SENT: 'SENT', OPENED: 'OPENED', IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED', CORRECTION_REQUIRED: 'CORRECTION_REQUIRED', APPROVED: 'APPROVED',
}
export const FORM_STATUS_LIST = Object.values(FORM_STATUS)
export const FORM_STATUS_LABELS = {
  NOT_SENT: 'Not Sent', SENT: 'Sent', OPENED: 'Opened', IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted', CORRECTION_REQUIRED: 'Correction Required', APPROVED: 'Approved',
}

export const DOCUMENT_STATUS = { PENDING: 'PENDING', COMPLETE: 'COMPLETE' }
export const VERIFICATION_STATUS = { PENDING: 'PENDING', COMPLETE: 'COMPLETE' }

// Item 6's form sections — used both to render the candidate form and as
// the field-group vocabulary HR picks from on Request Correction ("select
// specific fields" — a correction targets a *section*, not a single input).
export const PREBOARDING_FORM_SECTIONS = [
  { key: 'personal', label: 'Personal Information' },
  { key: 'emergencyContact', label: 'Emergency Contact' },
  { key: 'employment', label: 'Employment Details' },
  { key: 'previousEmployment', label: 'Previous Employment' },
  { key: 'education', label: 'Education' },
  { key: 'bank', label: 'Bank Information' },
  { key: 'statutory', label: 'Statutory / Payroll Information' },
  { key: 'joining', label: 'Joining Information' },
]

export const RELOCATION_FIELDS_SECTION = 'joining'

// item 8 (Step 16) — document lifecycle. NOT_UPLOADED is implicit (a
// CandidateDocument row that exists but has no currentVersionId yet).
export const DOCUMENT_ITEM_STATUS = {
  NOT_UPLOADED: 'NOT_UPLOADED', UPLOADED: 'UPLOADED', UNDER_REVIEW: 'UNDER_REVIEW', VERIFIED: 'VERIFIED',
  REJECTED: 'REJECTED', REPLACEMENT_REQUIRED: 'REPLACEMENT_REQUIRED', WAIVED: 'WAIVED',
}
export const DOCUMENT_ITEM_STATUS_LIST = Object.values(DOCUMENT_ITEM_STATUS)
export const DOCUMENT_ITEM_STATUS_LABELS = {
  NOT_UPLOADED: 'Not Uploaded', UPLOADED: 'Uploaded', UNDER_REVIEW: 'Under Review', VERIFIED: 'Verified',
  REJECTED: 'Rejected', REPLACEMENT_REQUIRED: 'Replacement Required', WAIVED: 'Waived',
}
// A required item counts toward "documents complete" once it lands in one of these.
export const DOCUMENT_SATISFIED_STATUSES = [DOCUMENT_ITEM_STATUS.VERIFIED, DOCUMENT_ITEM_STATUS.WAIVED]
// ...and counts as "candidate has done their part" (upload-side progress) once here.
export const DOCUMENT_UPLOADED_STATUSES = [
  DOCUMENT_ITEM_STATUS.UPLOADED, DOCUMENT_ITEM_STATUS.UNDER_REVIEW, DOCUMENT_ITEM_STATUS.VERIFIED, DOCUMENT_ITEM_STATUS.WAIVED,
]

export const DOCUMENT_REQUIREMENT_CATEGORIES = ['Identity', 'Education', 'Employment', 'Bank', 'Statutory', 'Other']

export const DOCUMENT_REJECTION_REASONS = [
  'Document unreadable', 'Wrong document uploaded', 'Expired document', 'Name mismatch', 'Incomplete document', 'Other',
]

export const DOCUMENT_ALLOWED_FILE_TYPES = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
export const DOCUMENT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB, same ceiling as resumes

export const PREBOARDING_PERMISSIONS = {
  VIEW: 'preboarding.view', MANAGE: 'preboarding.manage',
  DOCUMENTS_VIEW: 'preboarding.documents.view', DOCUMENTS_UPLOAD: 'preboarding.documents.upload',
  DOCUMENTS_VERIFY: 'preboarding.documents.verify', DOCUMENTS_REJECT: 'preboarding.documents.reject',
  DOCUMENTS_WAIVE: 'preboarding.documents.waive',
}

export const PREBOARDING_VIEW_ROLES = CANDIDATE_VIEW_ROLES
export const PREBOARDING_MANAGE_ROLES = CANDIDATE_MANAGE_ROLES
export function canManagePreboarding(session) {
  return CANDIDATE_MANAGE_ROLES.includes(session.role)
}

// item 13 (Step 15) / item 14 (Step 16) — bank details, statutory info, and
// identity/statutory documents are all more sensitive than the rest of a
// preboarding profile. Deliberately narrower than PREBOARDING_VIEW_ROLES —
// no blanket MANAGER access, same shape as compensationConstants'
// COMPENSATION_VIEW_ROLES.
export const PREBOARDING_SENSITIVE_VIEW_ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN']
export function canViewSensitivePreboardingData(session) {
  return PREBOARDING_SENSITIVE_VIEW_ROLES.includes(session.role)
}
// Categories whose documents are gated behind the sensitive-data check —
// "managers/interviewers should not automatically see identity, statutory
// or bank documents."
export const SENSITIVE_DOCUMENT_CATEGORIES = ['Identity', 'Bank', 'Statutory']

// The one check every document action route (verify/reject/replace/waive)
// runs first — combines the general manage-preboarding gate with the
// per-category sensitive-data gate in one place.
export function canManageDocument(session, category) {
  if (!canManagePreboarding(session)) return false
  if (SENSITIVE_DOCUMENT_CATEGORIES.includes(category)) return canViewSensitivePreboardingData(session)
  return true
}
