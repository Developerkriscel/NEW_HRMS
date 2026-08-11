// Single source of truth for the Open Positions / Job Opening module —
// mirrors the shape of lib/recruitmentConstants.js (Step 2). Frontend and
// backend both import from here.
import { WORK_MODE, WORK_MODE_LIST, WORK_MODE_LABELS } from './recruitmentConstants'

export { WORK_MODE, WORK_MODE_LIST, WORK_MODE_LABELS }

export const JOB_STATUS = {
  DRAFT: 'DRAFT',
  OPEN: 'OPEN',
  PAUSED: 'PAUSED',
  CLOSED: 'CLOSED',
  FILLED: 'FILLED',
  CANCELLED: 'CANCELLED',
}
export const JOB_STATUS_LIST = Object.values(JOB_STATUS)
export const JOB_STATUS_LABELS = {
  DRAFT: 'Draft', OPEN: 'Open', PAUSED: 'Paused', CLOSED: 'Closed', FILLED: 'Filled', CANCELLED: 'Cancelled',
}

// Only DRAFT/OPEN/PAUSED are editable at all (Rule 8) — CLOSED/FILLED/CANCELLED
// are terminal. Edits while OPEN are allowed but get logged (see jobHelpers).
export const JOB_EDITABLE_STATUSES = [JOB_STATUS.DRAFT, JOB_STATUS.OPEN, JOB_STATUS.PAUSED]

// The `open` transition doubles as this step's stand-in for "Publish" —
// there's no external job-board publishing yet (that's Step 4), so moving
// DRAFT -> OPEN is what "Publish / Keep Draft" means internally for now.
// Its `from: [DRAFT]` list is also what enforces Rule 9 (can't publish a
// CLOSED/FILLED/CANCELLED job) — those statuses are simply never in `from`.
export const JOB_TRANSITIONS = {
  open: { from: [JOB_STATUS.DRAFT], to: JOB_STATUS.OPEN },
  pause: { from: [JOB_STATUS.OPEN], to: JOB_STATUS.PAUSED },
  reopen: { from: [JOB_STATUS.PAUSED, JOB_STATUS.CLOSED], to: JOB_STATUS.OPEN },
  close: { from: [JOB_STATUS.OPEN, JOB_STATUS.PAUSED], to: JOB_STATUS.CLOSED },
  cancel: { from: [JOB_STATUS.DRAFT, JOB_STATUS.OPEN, JOB_STATUS.PAUSED], to: JOB_STATUS.CANCELLED },
}

// FILLED has no manual action/endpoint in Step 3 — there's no candidate
// join-tracking yet to drive it automatically either. It's a defined status
// a later step will set once "remainingOpenings hits 0 via actual joins" is
// real (per spec: "I recommend actual joined employees for final fill count").

export const JOB_EMPLOYMENT_TYPE = { FULL_TIME: 'FULL_TIME', PART_TIME: 'PART_TIME', CONTRACT: 'CONTRACT', INTERNSHIP: 'INTERNSHIP', TEMPORARY: 'TEMPORARY' }
export const JOB_EMPLOYMENT_TYPE_LIST = Object.values(JOB_EMPLOYMENT_TYPE)
export const JOB_EMPLOYMENT_TYPE_LABELS = { FULL_TIME: 'Full Time', PART_TIME: 'Part Time', CONTRACT: 'Contract', INTERNSHIP: 'Internship', TEMPORARY: 'Temporary' }

export const SKILL_TYPE = { REQUIRED: 'REQUIRED', PREFERRED: 'PREFERRED' }
export const SKILL_TYPE_LIST = Object.values(SKILL_TYPE)

export const SKILL_PROFICIENCY = { BEGINNER: 'BEGINNER', INTERMEDIATE: 'INTERMEDIATE', ADVANCED: 'ADVANCED', EXPERT: 'EXPERT' }
export const SKILL_PROFICIENCY_LIST = Object.values(SKILL_PROFICIENCY)
export const SKILL_PROFICIENCY_LABELS = { BEGINNER: 'Beginner', INTERMEDIATE: 'Intermediate', ADVANCED: 'Advanced', EXPERT: 'Expert' }

export const SCREENING_QUESTION_TYPE = { TEXT: 'TEXT', NUMBER: 'NUMBER', YES_NO: 'YES_NO', SINGLE_SELECT: 'SINGLE_SELECT', MULTI_SELECT: 'MULTI_SELECT' }
export const SCREENING_QUESTION_TYPE_LIST = Object.values(SCREENING_QUESTION_TYPE)
export const SCREENING_QUESTION_TYPE_LABELS = { TEXT: 'Text', NUMBER: 'Number', YES_NO: 'Yes / No', SINGLE_SELECT: 'Single Select', MULTI_SELECT: 'Multi Select' }
// Question types whose answers are meaningfully comparable against a
// knockout `rule` (a free-text "minimum acceptable answer").
export const SCREENING_TYPES_WITH_OPTIONS = [SCREENING_QUESTION_TYPE.SINGLE_SELECT, SCREENING_QUESTION_TYPE.MULTI_SELECT]

export const APPLICATION_FIELD = {
  RESUME: 'RESUME', PHONE: 'PHONE', EMAIL: 'EMAIL', CURRENT_COMPANY: 'CURRENT_COMPANY',
  CURRENT_DESIGNATION: 'CURRENT_DESIGNATION', CURRENT_CTC: 'CURRENT_CTC', EXPECTED_CTC: 'EXPECTED_CTC',
  NOTICE_PERIOD: 'NOTICE_PERIOD', LINKEDIN: 'LINKEDIN', PORTFOLIO: 'PORTFOLIO', GITHUB: 'GITHUB', COVER_LETTER: 'COVER_LETTER',
}
export const APPLICATION_FIELD_LIST = Object.values(APPLICATION_FIELD)
export const APPLICATION_FIELD_LABELS = {
  RESUME: 'Resume', PHONE: 'Phone Number', EMAIL: 'Email', CURRENT_COMPANY: 'Current Company',
  CURRENT_DESIGNATION: 'Current Designation', CURRENT_CTC: 'Current CTC', EXPECTED_CTC: 'Expected CTC',
  NOTICE_PERIOD: 'Notice Period', LINKEDIN: 'LinkedIn', PORTFOLIO: 'Portfolio', GITHUB: 'GitHub', COVER_LETTER: 'Cover Letter',
}
export const APPLICATION_FIELD_REQUIREMENT = { REQUIRED: 'REQUIRED', OPTIONAL: 'OPTIONAL', HIDDEN: 'HIDDEN' }
export const APPLICATION_FIELD_REQUIREMENT_LIST = Object.values(APPLICATION_FIELD_REQUIREMENT)
// Sensible starting point when a job is first created — HR adjusts from here.
export const DEFAULT_APPLICATION_FIELDS = [
  { fieldName: 'RESUME', requirement: 'REQUIRED' },
  { fieldName: 'PHONE', requirement: 'REQUIRED' },
  { fieldName: 'EMAIL', requirement: 'REQUIRED' },
  { fieldName: 'CURRENT_COMPANY', requirement: 'OPTIONAL' },
  { fieldName: 'CURRENT_DESIGNATION', requirement: 'OPTIONAL' },
  { fieldName: 'CURRENT_CTC', requirement: 'OPTIONAL' },
  { fieldName: 'EXPECTED_CTC', requirement: 'OPTIONAL' },
  { fieldName: 'NOTICE_PERIOD', requirement: 'OPTIONAL' },
  { fieldName: 'LINKEDIN', requirement: 'OPTIONAL' },
  { fieldName: 'PORTFOLIO', requirement: 'HIDDEN' },
  { fieldName: 'GITHUB', requirement: 'HIDDEN' },
  { fieldName: 'COVER_LETTER', requirement: 'HIDDEN' },
]

// REJECTED added in Step 8 — a virtual category, not an actual
// job_pipeline_stages row (rejection is tracked via Application.status +
// application_stage_history, not by moving into a stage named "Rejected").
// Kept in this enum so dashboard reporting has one consistent category set
// to group by, per the spec's own "this allows dashboard reporting to stay
// consistent" note.
export const PIPELINE_STAGE_CATEGORY = {
  APPLIED: 'APPLIED', SCREENING: 'SCREENING', ASSESSMENT: 'ASSESSMENT', INTERVIEW: 'INTERVIEW',
  SELECTED: 'SELECTED', OFFER: 'OFFER', HIRED: 'HIRED', REJECTED: 'REJECTED',
}
export const PIPELINE_STAGE_CATEGORY_LIST = Object.values(PIPELINE_STAGE_CATEGORY)
export const PIPELINE_STAGE_CATEGORY_LABELS = {
  APPLIED: 'Applied', SCREENING: 'Screening', ASSESSMENT: 'Assessment', INTERVIEW: 'Interview',
  SELECTED: 'Selected', OFFER: 'Offer', HIRED: 'Hired', REJECTED: 'Rejected',
}
// Item 7 — "stage rules": which category unlocks which not-yet-built
// module's entry point. Only the button/trigger is prepared, per spec.
export const STAGE_CATEGORY_UNLOCKS = {
  ASSESSMENT: 'Assign Assessment', INTERVIEW: 'Schedule Interview', SELECTED: 'Propose Compensation', OFFER: 'Create Offer',
}
// Item 20 — stage aging SLA. Not a persisted per-stage field (Step 3's
// pipeline editor isn't being reopened for this) — a sensible per-category
// default is enough to power "N days overdue" warnings, and is the one
// place to tune if that default ever needs to change.
export const STAGE_SLA_DAYS = {
  APPLIED: 2, SCREENING: 3, ASSESSMENT: 5, INTERVIEW: 5, SELECTED: 3, OFFER: 5, HIRED: null,
}

// Starting-point templates HR picks from — not a persisted/tenant-configurable
// collection in Step 3 (only the resulting per-job job_pipeline_stages rows
// are stored), so this lives here as static data rather than a DB table.
export const PIPELINE_TEMPLATES = {
  DEFAULT_HIRING: {
    label: 'Default Hiring',
    stages: [
      { name: 'Applied', category: 'APPLIED' },
      { name: 'HR Screening', category: 'SCREENING' },
      { name: 'Shortlisted', category: 'SCREENING' },
      { name: 'Interview', category: 'INTERVIEW' },
      { name: 'Selected', category: 'SELECTED' },
      { name: 'Offer', category: 'OFFER' },
      { name: 'Hired', category: 'HIRED' },
    ],
  },
  TECHNICAL_HIRING: {
    label: 'Technical Hiring',
    stages: [
      { name: 'Applied', category: 'APPLIED' },
      { name: 'HR Screening', category: 'SCREENING' },
      { name: 'Coding Assessment', category: 'ASSESSMENT' },
      { name: 'Technical Round', category: 'INTERVIEW' },
      { name: 'Manager Round', category: 'INTERVIEW' },
      { name: 'HR Round', category: 'INTERVIEW' },
      { name: 'Selected', category: 'SELECTED' },
    ],
  },
  SALES_HIRING: {
    label: 'Sales Hiring',
    stages: [
      { name: 'Applied', category: 'APPLIED' },
      { name: 'HR Screening', category: 'SCREENING' },
      { name: 'Role Play / Pitch Round', category: 'ASSESSMENT' },
      { name: 'Manager Round', category: 'INTERVIEW' },
      { name: 'Selected', category: 'SELECTED' },
      { name: 'Offer', category: 'OFFER' },
      { name: 'Hired', category: 'HIRED' },
    ],
  },
  INTERN_HIRING: {
    label: 'Intern Hiring',
    stages: [
      { name: 'Applied', category: 'APPLIED' },
      { name: 'HR Screening', category: 'SCREENING' },
      { name: 'Interview', category: 'INTERVIEW' },
      { name: 'Selected', category: 'SELECTED' },
      { name: 'Offer', category: 'OFFER' },
      { name: 'Joined', category: 'HIRED' },
    ],
  },
}
export const PIPELINE_TEMPLATE_LIST = Object.keys(PIPELINE_TEMPLATES)

export const JOB_VISIBILITY = { INTERNAL_ONLY: 'INTERNAL_ONLY', PUBLIC: 'PUBLIC', CONFIDENTIAL: 'CONFIDENTIAL' }
export const JOB_VISIBILITY_LIST = Object.values(JOB_VISIBILITY)
export const JOB_VISIBILITY_LABELS = { INTERNAL_ONLY: 'Internal Only', PUBLIC: 'Public', CONFIDENTIAL: 'Confidential' }
export const JOB_VISIBILITY_DESCRIPTIONS = {
  INTERNAL_ONLY: 'Only internal employees/HR can see it.',
  PUBLIC: 'Can later be published to the career page/job boards.',
  CONFIDENTIAL: 'Restricted to specific roles/access.',
}

export const JOB_ACTIVITY_TYPE = {
  CREATED: 'CREATED', UPDATED: 'UPDATED', OPENED: 'OPENED', PAUSED: 'PAUSED',
  REOPENED: 'REOPENED', CLOSED: 'CLOSED', CANCELLED: 'CANCELLED', DUPLICATED: 'DUPLICATED',
  // Step 4 — job_publications drives its own per-channel status, but a
  // one-line note still lands on the job's own timeline so "what happened
  // to this job" reads as one story.
  PUBLISHED: 'PUBLISHED', UNPUBLISHED: 'UNPUBLISHED',
}

export const JOB_PERMISSIONS = {
  VIEW: 'job.view', CREATE: 'job.create', EDIT: 'job.edit', OPEN: 'job.open', PAUSE: 'job.pause',
  CLOSE: 'job.close', CANCEL: 'job.cancel', DUPLICATE: 'job.duplicate',
  CREATE_WITHOUT_REQUISITION: 'job.create_without_requisition',
  // Reserved for Step 4 — external publishing is out of scope here.
  PUBLISH: 'job.publish',
}

// Everyone who can see the Recruitment module can see Open Positions —
// these are meant to eventually be public postings, unlike Requisitions.
export const JOB_VIEW_ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'SUPER_ADMIN']
// But only HR/Admin actually run the posting — a Manager doesn't open/pause/
// close/duplicate job openings, only raises the requisition behind them.
export const JOB_MANAGE_ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN']

export function canManageJobs(session) {
  return JOB_MANAGE_ROLES.includes(session.role)
}

// Direct job creation (no approved requisition behind it) is opt-in per
// spec: "Company Admin can decide whether direct creation is allowed" — an
// HR Manager needs the explicit permission grant; Company Admin/Super Admin
// always can.
export function canCreateWithoutRequisition(session) {
  if (session.role === 'COMPANY_ADMIN' || session.role === 'SUPER_ADMIN') return true
  if (session.role === 'HR_MANAGER') return (session.permissions || []).includes(JOB_PERMISSIONS.CREATE_WITHOUT_REQUISITION)
  return false
}

// Mirrors getAvailableActions in recruitmentConstants.js — which buttons the
// UI should offer for a given job + viewer, matching what the backend will
// actually allow.
export function getAvailableJobActions(job, session) {
  const actions = ['view']
  if (!canManageJobs(session)) return actions

  const status = job.status
  if (JOB_EDITABLE_STATUSES.includes(status)) actions.push('edit')
  if (JOB_TRANSITIONS.open.from.includes(status)) actions.push('open')
  if (JOB_TRANSITIONS.pause.from.includes(status)) actions.push('pause')
  if (JOB_TRANSITIONS.reopen.from.includes(status)) actions.push('reopen')
  if (JOB_TRANSITIONS.close.from.includes(status)) actions.push('close')
  if (JOB_TRANSITIONS.cancel.from.includes(status)) actions.push('cancel')
  actions.push('duplicate')
  return actions
}

// Rule: totalOpenings - filledOpenings, floored at 0 for display safety.
export function computeRemainingOpenings(job) {
  return Math.max(0, (job.totalOpenings || 0) - (job.filledOpenings || 0))
}
