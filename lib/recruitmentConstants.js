// Single source of truth for every enum, permission name and status-flow
// rule used by the Job Requisitions module — frontend and backend both
// import from here so nothing hardcodes a raw status/priority string.
// Safe to import from client components (no Node-only APIs).

export const REQUISITION_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  JOB_CREATED: 'JOB_CREATED',
  CLOSED: 'CLOSED',
}
export const REQUISITION_STATUS_LIST = Object.values(REQUISITION_STATUS)
export const REQUISITION_STATUS_LABELS = {
  DRAFT: 'Draft',
  PENDING_APPROVAL: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  JOB_CREATED: 'Job Created',
  CLOSED: 'Closed',
}

// Statuses in which the requisition form fields may still be changed.
// Rule 2: an Approved requisition (and anything past it) is read-only.
export const REQUISITION_EDITABLE_STATUSES = [REQUISITION_STATUS.DRAFT, REQUISITION_STATUS.PENDING_APPROVAL]

// Which statuses each workflow action is allowed to fire from, and where it lands.
export const REQUISITION_TRANSITIONS = {
  submit: { from: [REQUISITION_STATUS.DRAFT], to: REQUISITION_STATUS.PENDING_APPROVAL },
  approve: { from: [REQUISITION_STATUS.PENDING_APPROVAL], to: REQUISITION_STATUS.APPROVED },
  reject: { from: [REQUISITION_STATUS.PENDING_APPROVAL], to: REQUISITION_STATUS.REJECTED },
  cancel: { from: [REQUISITION_STATUS.DRAFT, REQUISITION_STATUS.PENDING_APPROVAL, REQUISITION_STATUS.APPROVED], to: REQUISITION_STATUS.CANCELLED },
}

export const PRIORITY = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH', URGENT: 'URGENT' }
export const PRIORITY_LIST = Object.values(PRIORITY)
export const PRIORITY_LABELS = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', URGENT: 'Urgent' }
// Step 2 placeholder — spec says not to let HR type this manually, and to
// derive it from Recruitment Settings later. There's no Settings module yet
// (it's still a "Coming Soon" stub), so this hardcoded map stands in until
// that exists; swap it for a tenant-configurable lookup then.
export const PRIORITY_SLA_DAYS = { LOW: 60, MEDIUM: 45, HIGH: 30, URGENT: 15 }

export const EMPLOYMENT_TYPE = { FULL_TIME: 'FULL_TIME', PART_TIME: 'PART_TIME', CONTRACT: 'CONTRACT', INTERNSHIP: 'INTERNSHIP' }
export const EMPLOYMENT_TYPE_LIST = Object.values(EMPLOYMENT_TYPE)
export const EMPLOYMENT_TYPE_LABELS = { FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract', INTERNSHIP: 'Internship' }

export const WORK_MODE = { ONSITE: 'ONSITE', HYBRID: 'HYBRID', REMOTE: 'REMOTE' }
export const WORK_MODE_LIST = Object.values(WORK_MODE)
export const WORK_MODE_LABELS = { ONSITE: 'Onsite', HYBRID: 'Hybrid', REMOTE: 'Remote' }

export const HIRING_REASON = {
  NEW_POSITION: 'NEW_POSITION',
  REPLACEMENT: 'REPLACEMENT',
  EXPANSION: 'EXPANSION',
  PROJECT_REQUIREMENT: 'PROJECT_REQUIREMENT',
  BACKFILL: 'BACKFILL',
  OTHER: 'OTHER',
}
export const HIRING_REASON_LIST = Object.values(HIRING_REASON)
export const HIRING_REASON_LABELS = {
  NEW_POSITION: 'New Position',
  REPLACEMENT: 'Replacement',
  EXPANSION: 'Expansion',
  PROJECT_REQUIREMENT: 'Project Requirement',
  BACKFILL: 'Backfill',
  OTHER: 'Other',
}

export const BUDGET_TYPE = { ANNUAL_CTC: 'ANNUAL_CTC', MONTHLY: 'MONTHLY', HOURLY: 'HOURLY' }
export const BUDGET_TYPE_LIST = Object.values(BUDGET_TYPE)
export const BUDGET_TYPE_LABELS = { ANNUAL_CTC: 'Annual CTC', MONTHLY: 'Monthly', HOURLY: 'Hourly' }

export const SKILL_TYPE = { REQUIRED: 'REQUIRED', PREFERRED: 'PREFERRED' }
export const SKILL_TYPE_LIST = Object.values(SKILL_TYPE)

export const REQUISITION_ACTIVITY_TYPE = {
  CREATED: 'CREATED',
  UPDATED: 'UPDATED',
  SUBMITTED: 'SUBMITTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  // Step 3 — set when this requisition is converted into a Job Opening.
  JOB_CREATED: 'JOB_CREATED',
}

export const REQUISITION_PERMISSIONS = {
  VIEW: 'requisition.view',
  CREATE: 'requisition.create',
  EDIT: 'requisition.edit',
  SUBMIT: 'requisition.submit',
  APPROVE: 'requisition.approve',
  REJECT: 'requisition.reject',
  CANCEL: 'requisition.cancel',
}

// Roles allowed anywhere near the module at all. Everyone else (Employee,
// Finance, IT Admin) gets no access by default, per spec.
export const REQUISITION_ACCESS_ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'SUPER_ADMIN']

// Company Admin / Super Admin can always approve or reject. An HR Manager
// additionally needs the `requisition.approve` permission grant (via the
// existing Permission catalogue / Roles & Permissions page) — "approve if
// company permission allows" per spec. Managers never approve.
export function canApproveOrReject(session) {
  if (session.role === 'COMPANY_ADMIN' || session.role === 'SUPER_ADMIN') return true
  if (session.role === 'HR_MANAGER') return (session.permissions || []).includes(REQUISITION_PERMISSIONS.APPROVE)
  return false
}

// Manager can only act on their own requisitions; HR/Admin can act on any.
export function canManageRequisition(session, requisition) {
  if (['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'].includes(session.role)) return true
  if (session.role === 'MANAGER') return String(requisition.requestedBy?._id || requisition.requestedBy) === session.userId
  return false
}

// Designation.department is optional, and the Designations page lets you create
// one without picking a department. Those are org-wide job titles, so they stay
// selectable whichever department the form has chosen — otherwise they would be
// unreachable from every requisition and job form.
export function matchesDepartment(designation, departmentId) {
  const owner = designation.department?._id || designation.department
  if (!owner) return true
  return String(owner) === String(departmentId)
}

// SLA is display-only for Step 2 — computed from the submission (or, before
// submission, today's) date plus the priority's target-fill window.
export function computeSlaTargetDate(priority, fromDate) {
  const days = PRIORITY_SLA_DAYS[priority]
  if (!days) return null
  const base = fromDate ? new Date(fromDate) : new Date()
  const target = new Date(base)
  target.setDate(target.getDate() + days)
  return target
}

// Which actions the UI should offer for a given status + viewer, mirroring
// the backend's own transition/permission gates so the buttons shown always
// match what will actually succeed.
export function getAvailableActions(requisition, session) {
  const actions = []
  const status = requisition.status
  const isOwnerOrManager = canManageRequisition(session, requisition)

  actions.push('view')
  if (isOwnerOrManager && REQUISITION_EDITABLE_STATUSES.includes(status)) actions.push('edit')
  if (isOwnerOrManager && status === REQUISITION_STATUS.DRAFT) actions.push('submit')
  if (canApproveOrReject(session) && status === REQUISITION_STATUS.PENDING_APPROVAL) {
    actions.push('approve', 'reject')
  }
  if (isOwnerOrManager && REQUISITION_TRANSITIONS.cancel.from.includes(status)) actions.push('cancel')
  // Job management (Step 3) is its own role set, not gated by the approve
  // permission — inlined here rather than importing lib/jobConstants.js to
  // avoid a circular import (jobConstants already imports from this file).
  if (['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN'].includes(session.role) && status === REQUISITION_STATUS.APPROVED) {
    actions.push('createJob')
  }

  return actions
}
