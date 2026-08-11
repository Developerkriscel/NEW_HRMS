// Step 9 — Assessment Management. Single source of truth, same pattern as
// every other lib/*Constants.js file in this module.
import { CANDIDATE_VIEW_ROLES, CANDIDATE_MANAGE_ROLES } from './candidateConstants'

export const ASSESSMENT_TYPE = {
  CODING_TEST: 'CODING_TEST', TECHNICAL_MCQ: 'TECHNICAL_MCQ', APTITUDE: 'APTITUDE',
  LOGICAL_REASONING: 'LOGICAL_REASONING', COMMUNICATION: 'COMMUNICATION', WRITING_TEST: 'WRITING_TEST',
  ROLE_QUESTIONNAIRE: 'ROLE_QUESTIONNAIRE', TAKE_HOME_ASSIGNMENT: 'TAKE_HOME_ASSIGNMENT', CUSTOM: 'CUSTOM',
}
export const ASSESSMENT_TYPE_LIST = Object.values(ASSESSMENT_TYPE)
export const ASSESSMENT_TYPE_LABELS = {
  CODING_TEST: 'Coding Test', TECHNICAL_MCQ: 'Technical MCQ', APTITUDE: 'Aptitude',
  LOGICAL_REASONING: 'Logical Reasoning', COMMUNICATION: 'Communication', WRITING_TEST: 'Writing Test',
  ROLE_QUESTIONNAIRE: 'Role-Based Questionnaire', TAKE_HOME_ASSIGNMENT: 'Take-Home Assignment', CUSTOM: 'Custom Assessment',
}

export const ASSESSMENT_MASTER_STATUS = { DRAFT: 'DRAFT', ACTIVE: 'ACTIVE', ARCHIVED: 'ARCHIVED' }
export const ASSESSMENT_MASTER_STATUS_LIST = Object.values(ASSESSMENT_MASTER_STATUS)
export const ASSESSMENT_MASTER_STATUS_LABELS = { DRAFT: 'Draft', ACTIVE: 'Active', ARCHIVED: 'Archived' }

export const QUESTION_TYPE = {
  SINGLE_CHOICE: 'SINGLE_CHOICE', MULTIPLE_CHOICE: 'MULTIPLE_CHOICE', TRUE_FALSE: 'TRUE_FALSE',
  SHORT_ANSWER: 'SHORT_ANSWER', LONG_ANSWER: 'LONG_ANSWER', NUMERIC: 'NUMERIC',
  FILE_UPLOAD: 'FILE_UPLOAD', URL_SUBMISSION: 'URL_SUBMISSION',
}
export const QUESTION_TYPE_LIST = Object.values(QUESTION_TYPE)
export const QUESTION_TYPE_LABELS = {
  SINGLE_CHOICE: 'Single Choice', MULTIPLE_CHOICE: 'Multiple Choice', TRUE_FALSE: 'True / False',
  SHORT_ANSWER: 'Short Answer', LONG_ANSWER: 'Long Answer', NUMERIC: 'Numeric',
  FILE_UPLOAD: 'File Upload', URL_SUBMISSION: 'URL Submission',
}
// Objective types are scored automatically against a stored correct
// answer; everything else needs a human to look at it (item 9 vs 10).
export const AUTO_GRADABLE_TYPES = [QUESTION_TYPE.SINGLE_CHOICE, QUESTION_TYPE.MULTIPLE_CHOICE, QUESTION_TYPE.TRUE_FALSE, QUESTION_TYPE.NUMERIC, QUESTION_TYPE.SHORT_ANSWER]
export const CHOICE_TYPES = [QUESTION_TYPE.SINGLE_CHOICE, QUESTION_TYPE.MULTIPLE_CHOICE, QUESTION_TYPE.TRUE_FALSE]

export const QUESTION_DIFFICULTY = { EASY: 'EASY', MEDIUM: 'MEDIUM', HARD: 'HARD' }
export const QUESTION_DIFFICULTY_LIST = Object.values(QUESTION_DIFFICULTY)

export const SUBMISSION_TYPE = { TEXT: 'TEXT', FILE_UPLOAD: 'FILE_UPLOAD', URL: 'URL', GIT_REPOSITORY: 'GIT_REPOSITORY' }
export const SUBMISSION_TYPE_LIST = Object.values(SUBMISSION_TYPE)
export const SUBMISSION_TYPE_LABELS = { TEXT: 'Text', FILE_UPLOAD: 'File Upload', URL: 'URL', GIT_REPOSITORY: 'Git Repository' }

// The attempt/assignment lifecycle — item 8, exactly as spec'd.
export const CANDIDATE_ASSESSMENT_STATUS = {
  ASSIGNED: 'ASSIGNED', SENT: 'SENT', OPENED: 'OPENED', IN_PROGRESS: 'IN_PROGRESS',
  SUBMITTED: 'SUBMITTED', EVALUATING: 'EVALUATING', COMPLETED: 'COMPLETED', EXPIRED: 'EXPIRED', CANCELLED: 'CANCELLED',
}
export const CANDIDATE_ASSESSMENT_STATUS_LIST = Object.values(CANDIDATE_ASSESSMENT_STATUS)
export const CANDIDATE_ASSESSMENT_STATUS_LABELS = {
  ASSIGNED: 'Assigned', SENT: 'Sent', OPENED: 'Opened', IN_PROGRESS: 'In Progress', SUBMITTED: 'Submitted',
  EVALUATING: 'Evaluating', COMPLETED: 'Completed', EXPIRED: 'Expired', CANCELLED: 'Cancelled',
}
export const CANDIDATE_ASSESSMENT_ACTIVE_STATUSES = [
  CANDIDATE_ASSESSMENT_STATUS.ASSIGNED, CANDIDATE_ASSESSMENT_STATUS.SENT, CANDIDATE_ASSESSMENT_STATUS.OPENED, CANDIDATE_ASSESSMENT_STATUS.IN_PROGRESS,
]

export const ASSESSMENT_RESULT = { PENDING: 'PENDING', PASSED: 'PASSED', FAILED: 'FAILED' }
export const ASSESSMENT_RESULT_LIST = Object.values(ASSESSMENT_RESULT)

// Item 12 — advisory only, exactly like the AI match label. Never an
// auto-reject switch.
export const EVALUATION_RECOMMENDATION = { PROCEED: 'PROCEED', REVIEW: 'REVIEW', DO_NOT_PROCEED: 'DO_NOT_PROCEED' }
export const EVALUATION_RECOMMENDATION_LIST = Object.values(EVALUATION_RECOMMENDATION)
export const EVALUATION_RECOMMENDATION_LABELS = { PROCEED: 'Proceed', REVIEW: 'Review', DO_NOT_PROCEED: 'Do Not Proceed' }

// Item 13 — external providers are recorded, not actually integrated with.
export const EXTERNAL_PROVIDER = { HACKERRANK: 'HACKERRANK', CODILITY: 'CODILITY', TESTGORILLA: 'TESTGORILLA', CUSTOM_URL: 'CUSTOM_URL' }
export const EXTERNAL_PROVIDER_LIST = Object.values(EXTERNAL_PROVIDER)
export const EXTERNAL_PROVIDER_LABELS = { HACKERRANK: 'HackerRank', CODILITY: 'Codility', TESTGORILLA: 'TestGorilla', CUSTOM_URL: 'Custom URL' }

export const ASSESSMENT_VIEW_ROLES = CANDIDATE_VIEW_ROLES
export const ASSESSMENT_MANAGE_ROLES = CANDIDATE_MANAGE_ROLES
export function canManageAssessments(session) {
  return CANDIDATE_MANAGE_ROLES.includes(session.role)
}

// A handful of ready-made starting points shown as "duplicate this" cards
// on the Assessment Master list — not a separate DB-backed template
// concept (every assessment row here is already reusable across jobs, per
// the spec's own "then jobs can reuse templates").
export const ASSESSMENT_STARTER_EXAMPLES = [
  'Backend Developer Screening', 'Frontend Developer Screening', 'Sales Aptitude', 'HR Executive Screening', 'Intern Aptitude',
]
