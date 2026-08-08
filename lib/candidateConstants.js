// Single source of truth for the Candidate / Application module — same
// pattern as the other lib/*Constants.js files. Frontend and backend both
// import from here.

export const CANDIDATE_STATUS = { ACTIVE: 'ACTIVE', TALENT_POOL: 'TALENT_POOL', ARCHIVED: 'ARCHIVED', DO_NOT_CONTACT: 'DO_NOT_CONTACT' }
export const CANDIDATE_STATUS_LIST = Object.values(CANDIDATE_STATUS)
export const CANDIDATE_STATUS_LABELS = { ACTIVE: 'Active', TALENT_POOL: 'Talent Pool', ARCHIVED: 'Archived', DO_NOT_CONTACT: 'Do Not Contact' }

export const APPLICATION_STATUS = { ACTIVE: 'ACTIVE', WITHDRAWN: 'WITHDRAWN', REJECTED: 'REJECTED', HIRED: 'HIRED' }
export const APPLICATION_STATUS_LIST = Object.values(APPLICATION_STATUS)
export const APPLICATION_STATUS_LABELS = { ACTIVE: 'Active', WITHDRAWN: 'Withdrawn', REJECTED: 'Rejected', HIRED: 'Hired' }

// Mirrors PUBLISHING_CHANNEL (lib/publishingConstants.js) — an application's
// source is where the candidate actually came from, which for a published
// job is one of those channels. MANUAL covers a candidate HR adds by hand
// later; DIRECT covers a career-page visit with no ?source= param at all.
export const APPLICATION_SOURCE = {
  CAREER_PAGE: 'CAREER_PAGE', LINKEDIN: 'LINKEDIN', NAUKRI: 'NAUKRI', INDEED: 'INDEED',
  FOUNDIT: 'FOUNDIT', REFERRAL: 'REFERRAL', OTHER: 'OTHER', MANUAL: 'MANUAL', DIRECT: 'DIRECT',
}
export const APPLICATION_SOURCE_LIST = Object.values(APPLICATION_SOURCE)
export const APPLICATION_SOURCE_LABELS = {
  CAREER_PAGE: 'Career Page', LINKEDIN: 'LinkedIn', NAUKRI: 'Naukri', INDEED: 'Indeed',
  FOUNDIT: 'Foundit', REFERRAL: 'Referral', OTHER: 'Other', MANUAL: 'Manual', DIRECT: 'Direct',
}

// The `?source=` query param on a tracking link (see lib/publicJobHelpers.js
// / CHANNEL_SOURCE_KEY) is lowercase/underscored; this maps it back to the
// enum stored on Candidate/Application. Unrecognized or missing -> DIRECT.
const SOURCE_PARAM_TO_ENUM = {
  career_page: APPLICATION_SOURCE.CAREER_PAGE, linkedin: APPLICATION_SOURCE.LINKEDIN,
  naukri: APPLICATION_SOURCE.NAUKRI, indeed: APPLICATION_SOURCE.INDEED,
  foundit: APPLICATION_SOURCE.FOUNDIT, referral: APPLICATION_SOURCE.REFERRAL, other: APPLICATION_SOURCE.OTHER,
}
export function normalizeSource(rawSourceParam) {
  if (!rawSourceParam) return APPLICATION_SOURCE.DIRECT
  return SOURCE_PARAM_TO_ENUM[String(rawSourceParam).toLowerCase()] || APPLICATION_SOURCE.OTHER
}

export const ACTIVITY_ENTRY_TYPE = {
  CREATED: 'CREATED', APPLICATION_ADDED: 'APPLICATION_ADDED', NOTE: 'NOTE', STAGE_CHANGED: 'STAGE_CHANGED',
  STATUS_CHANGED: 'STATUS_CHANGED', UPDATED: 'UPDATED',
}

// Resume upload constraints — Step 5 stores the file; parsing it comes in
// a later step.
export const RESUME_MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
export const RESUME_ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx']
export const RESUME_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

// Viewing candidates/applications is the same broad recruitment-module
// visibility as Jobs/Requisitions — Step 5's spec has no dedicated
// permission-strings section, unlike Steps 2-4.
export const CANDIDATE_VIEW_ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'MANAGER', 'SUPER_ADMIN']
export const CANDIDATE_MANAGE_ROLES = ['COMPANY_ADMIN', 'HR_MANAGER', 'SUPER_ADMIN']

export function canManageCandidates(session) {
  return CANDIDATE_MANAGE_ROLES.includes(session.role)
}
