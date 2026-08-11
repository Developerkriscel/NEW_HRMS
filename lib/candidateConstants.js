// Single source of truth for the Candidate / Application module — same
// pattern as the other lib/*Constants.js files. Frontend and backend both
// import from here.

export const CANDIDATE_STATUS = { ACTIVE: 'ACTIVE', TALENT_POOL: 'TALENT_POOL', HIRED: 'HIRED', ARCHIVED: 'ARCHIVED', DO_NOT_CONTACT: 'DO_NOT_CONTACT' }
export const CANDIDATE_STATUS_LIST = Object.values(CANDIDATE_STATUS)
export const CANDIDATE_STATUS_LABELS = { ACTIVE: 'Active', TALENT_POOL: 'Talent Pool', HIRED: 'Hired', ARCHIVED: 'Archived', DO_NOT_CONTACT: 'Do Not Contact' }

// ON_HOLD added in Step 8 — a pause, not a stage; the application keeps its
// currentStage untouched while on hold.
export const APPLICATION_STATUS = { ACTIVE: 'ACTIVE', ON_HOLD: 'ON_HOLD', WITHDRAWN: 'WITHDRAWN', REJECTED: 'REJECTED', HIRED: 'HIRED' }
export const APPLICATION_STATUS_LIST = Object.values(APPLICATION_STATUS)
export const APPLICATION_STATUS_LABELS = { ACTIVE: 'Active', ON_HOLD: 'On Hold', WITHDRAWN: 'Withdrawn', REJECTED: 'Rejected', HIRED: 'Hired' }

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
  // Step 6 — the exact events the spec's "Activity Timeline" section lists.
  RESUME_UPLOADED: 'RESUME_UPLOADED', RESUME_PARSING_STARTED: 'RESUME_PARSING_STARTED',
  RESUME_PARSED: 'RESUME_PARSED', RESUME_PARSE_FAILED: 'RESUME_PARSE_FAILED',
  RESUME_REVIEWED: 'RESUME_REVIEWED', PROFILE_UPDATED: 'PROFILE_UPDATED',
  DUPLICATE_FLAGGED: 'DUPLICATE_FLAGGED',
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

// ---------------------------------------------------------------------------
// Step 6 — Resume Parsing + Candidate Profile Enrichment
// ---------------------------------------------------------------------------

export const RESUME_PARSING_STATUS = {
  UPLOADED: 'UPLOADED', PARSING: 'PARSING', PARSED: 'PARSED', REVIEW_REQUIRED: 'REVIEW_REQUIRED', FAILED: 'FAILED',
}
export const RESUME_PARSING_STATUS_LIST = Object.values(RESUME_PARSING_STATUS)
export const RESUME_PARSING_STATUS_LABELS = {
  UPLOADED: 'Uploaded', PARSING: 'Parsing…', PARSED: 'Parsed successfully', REVIEW_REQUIRED: 'Needs Review', FAILED: 'Parsing failed',
}

// How a candidate_resumes row entered the system — both feed the exact same
// parser (lib/resumeParser.js); "the parser should also work when HR
// manually adds a candidate."
export const RESUME_UPLOAD_SOURCE = { APPLICATION: 'APPLICATION', MANUAL_HR: 'MANUAL_HR' }
export const RESUME_UPLOAD_SOURCE_LIST = Object.values(RESUME_UPLOAD_SOURCE)

// Shared by candidate_skills / candidate_experience / candidate_education /
// candidate_certifications / candidate_projects — where a given row came
// from. ASSESSMENT is reserved for a later step (no assessments module yet).
export const PROFILE_RECORD_SOURCE = { MANUAL: 'MANUAL', RESUME: 'RESUME', ASSESSMENT: 'ASSESSMENT' }
export const PROFILE_RECORD_SOURCE_LIST = Object.values(PROFILE_RECORD_SOURCE)
export const PROFILE_RECORD_SOURCE_LABELS = { MANUAL: 'Manual', RESUME: 'Resume Extracted', ASSESSMENT: 'Assessment' }

// A field/section is flagged "Needs Review" below this confidence — "This is
// much better than pretending every extraction is certainly correct."
export const LOW_CONFIDENCE_THRESHOLD = 0.6

export const RESUME_PERMISSIONS = {
  VIEW: 'candidate.resume.view',
  UPLOAD: 'candidate.resume.upload',
  PARSE: 'candidate.resume.parse',
  REVIEW: 'candidate.resume.review',
  PROFILE_EDIT: 'candidate.profile.edit',
}

// Same broad-vs-narrow role split as the rest of the module — resume view
// rides on the existing CANDIDATE_VIEW_ROLES gate, everything that mutates
// (upload/parse/retry/review/apply/profile-edit) rides on CANDIDATE_MANAGE_ROLES.
export function canManageResumes(session) {
  return CANDIDATE_MANAGE_ROLES.includes(session.role)
}

// The "Resume Data Review" field-by-field comparison table — `name` is
// special-cased (splits into Candidate.firstName/lastName on apply), every
// other row maps 1:1 onto a Candidate scalar field. Shared between the
// server (lib/candidateProfileHelpers.js) and the client (Review UI labels)
// so the two never drift apart.
export const PERSONAL_REVIEW_FIELDS = [
  { key: 'name', candidateField: null, label: 'Full Name' },
  { key: 'email', candidateField: 'email', label: 'Email' },
  { key: 'phone', candidateField: 'phone', label: 'Phone' },
  { key: 'currentLocation', candidateField: 'currentLocation', label: 'Location' },
  { key: 'currentCompany', candidateField: 'currentCompany', label: 'Current Company' },
  { key: 'currentDesignation', candidateField: 'currentDesignation', label: 'Current Designation' },
  { key: 'totalExperience', candidateField: 'totalExperience', label: 'Total Experience (yrs)' },
  { key: 'relevantExperience', candidateField: 'relevantExperience', label: 'Relevant Experience (yrs)' },
  { key: 'linkedinUrl', candidateField: 'linkedinUrl', label: 'LinkedIn' },
  { key: 'githubUrl', candidateField: 'githubUrl', label: 'GitHub' },
  { key: 'portfolioUrl', candidateField: 'portfolioUrl', label: 'Portfolio' },
]

export const PROFILE_SECTIONS = [
  { key: 'skills', label: 'Skills' },
  { key: 'experience', label: 'Work Experience' },
  { key: 'education', label: 'Education' },
  { key: 'certifications', label: 'Certifications' },
  { key: 'projects', label: 'Projects' },
]
