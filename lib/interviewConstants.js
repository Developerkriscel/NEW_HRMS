// Step 10 — Interview Management.
import { CANDIDATE_VIEW_ROLES, CANDIDATE_MANAGE_ROLES } from './candidateConstants'

export const INTERVIEW_TYPE = {
  SCREENING: 'SCREENING', TECHNICAL: 'TECHNICAL', MANAGERIAL: 'MANAGERIAL', CULTURAL: 'CULTURAL', FINAL: 'FINAL', CUSTOM: 'CUSTOM',
}
export const INTERVIEW_TYPE_LIST = Object.values(INTERVIEW_TYPE)
export const INTERVIEW_TYPE_LABELS = {
  SCREENING: 'HR Screening', TECHNICAL: 'Technical', MANAGERIAL: 'Managerial', CULTURAL: 'Culture / Behavioral', FINAL: 'Final', CUSTOM: 'Custom',
}

export const INTERVIEW_MODE = { ONLINE: 'ONLINE', IN_PERSON: 'IN_PERSON', PHONE: 'PHONE' }
export const INTERVIEW_MODE_LIST = Object.values(INTERVIEW_MODE)
export const INTERVIEW_MODE_LABELS = { ONLINE: 'Online', IN_PERSON: 'In Person', PHONE: 'Phone' }

export const MEETING_PROVIDER = { GOOGLE_MEET: 'GOOGLE_MEET', MICROSOFT_TEAMS: 'MICROSOFT_TEAMS', ZOOM: 'ZOOM', CUSTOM_LINK: 'CUSTOM_LINK' }
export const MEETING_PROVIDER_LIST = Object.values(MEETING_PROVIDER)
export const MEETING_PROVIDER_LABELS = { GOOGLE_MEET: 'Google Meet', MICROSOFT_TEAMS: 'Microsoft Teams', ZOOM: 'Zoom', CUSTOM_LINK: 'Custom Link' }

// item 8 — exactly as spec'd. Outcome (select/reject/hold) is tracked
// separately via the existing Application/pipeline machinery from Step 8,
// not folded into this enum.
export const INTERVIEW_STATUS = {
  SCHEDULED: 'SCHEDULED', CONFIRMED: 'CONFIRMED', RESCHEDULED: 'RESCHEDULED', IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED', FEEDBACK_PENDING: 'FEEDBACK_PENDING', CANCELLED: 'CANCELLED', NO_SHOW: 'NO_SHOW',
}
export const INTERVIEW_STATUS_LIST = Object.values(INTERVIEW_STATUS)
export const INTERVIEW_STATUS_LABELS = {
  SCHEDULED: 'Scheduled', CONFIRMED: 'Confirmed', RESCHEDULED: 'Rescheduled', IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed', FEEDBACK_PENDING: 'Feedback Pending', CANCELLED: 'Cancelled', NO_SHOW: 'No Show',
}
export const INTERVIEW_ACTIVE_STATUSES = [INTERVIEW_STATUS.SCHEDULED, INTERVIEW_STATUS.CONFIRMED, INTERVIEW_STATUS.RESCHEDULED]

export const PANEL_ROLE = { PRIMARY: 'PRIMARY', PANELIST: 'PANELIST' }
export const PANEL_ROLE_LIST = Object.values(PANEL_ROLE)

export const ATTENDANCE_STATUS = { PENDING: 'PENDING', CONFIRMED: 'CONFIRMED', ATTENDED: 'ATTENDED', NO_SHOW: 'NO_SHOW' }
export const ATTENDANCE_STATUS_LIST = Object.values(ATTENDANCE_STATUS)

export const FEEDBACK_STATUS = { PENDING: 'PENDING', SUBMITTED: 'SUBMITTED' }
export const FEEDBACK_STATUS_LIST = Object.values(FEEDBACK_STATUS)

// item 13 — advisory recommendation, never an auto-select switch. Numeric
// weight is only used to compute the panel's average/consensus display.
export const INTERVIEW_RECOMMENDATION = { STRONG_HIRE: 'STRONG_HIRE', HIRE: 'HIRE', MIXED: 'MIXED', NO_HIRE: 'NO_HIRE', STRONG_NO_HIRE: 'STRONG_NO_HIRE' }
export const INTERVIEW_RECOMMENDATION_LIST = Object.values(INTERVIEW_RECOMMENDATION)
export const INTERVIEW_RECOMMENDATION_LABELS = {
  STRONG_HIRE: 'Strong Hire', HIRE: 'Hire', MIXED: 'Mixed', NO_HIRE: 'No Hire', STRONG_NO_HIRE: 'Strong No Hire',
}
export const RECOMMENDATION_WEIGHT = { STRONG_HIRE: 2, HIRE: 1, MIXED: 0, NO_HIRE: -1, STRONG_NO_HIRE: -2 }
// Consensus label from the average weight across all submitted feedback.
export function consensusFromAverageWeight(avg) {
  if (avg >= 1.5) return INTERVIEW_RECOMMENDATION.STRONG_HIRE
  if (avg >= 0.5) return INTERVIEW_RECOMMENDATION.HIRE
  if (avg > -0.5) return INTERVIEW_RECOMMENDATION.MIXED
  if (avg > -1.5) return INTERVIEW_RECOMMENDATION.NO_HIRE
  return INTERVIEW_RECOMMENDATION.STRONG_NO_HIRE
}

export const CANCELLATION_REASON = {
  CANDIDATE_REQUEST: 'Candidate Request', INTERVIEWER_UNAVAILABLE: 'Interviewer Unavailable', POSITION_PAUSED: 'Position Paused',
  CANDIDATE_WITHDREW: 'Candidate Withdrew', DUPLICATE_SCHEDULING: 'Duplicate Scheduling', OTHER: 'Other',
}
export const CANCELLATION_REASON_LIST = Object.values(CANCELLATION_REASON)

export const NO_SHOW_TYPE = { CANDIDATE: 'CANDIDATE', INTERVIEWER: 'INTERVIEWER' }

export const SCHEDULE_HISTORY_ACTION = { SCHEDULED: 'SCHEDULED', RESCHEDULED: 'RESCHEDULED', CANCELLED: 'CANCELLED' }

export const FEEDBACK_SLA_HOURS = 24

export const SCORECARD_CATEGORY = { TECHNICAL: 'TECHNICAL', MANAGERIAL: 'MANAGERIAL', SALES: 'SALES', HR: 'HR', CULTURAL: 'CULTURAL', INTERN: 'INTERN', CUSTOM: 'CUSTOM' }
export const SCORECARD_CATEGORY_LIST = Object.values(SCORECARD_CATEGORY)

export const INTERVIEW_PERMISSIONS = {
  VIEW: 'interview.view', SCHEDULE: 'interview.schedule', RESCHEDULE: 'interview.reschedule', CANCEL: 'interview.cancel',
  FEEDBACK_SUBMIT: 'interview.feedback.submit', FEEDBACK_VIEW: 'interview.feedback.view', SCORECARD_MANAGE: 'interview.scorecard.manage',
}

export const INTERVIEW_VIEW_ROLES = CANDIDATE_VIEW_ROLES
export const INTERVIEW_MANAGE_ROLES = CANDIDATE_MANAGE_ROLES
export function canManageInterviews(session) {
  return CANDIDATE_MANAGE_ROLES.includes(session.role)
}

// Default reusable scorecard templates (item 12/"Scorecard Templates") —
// auto-seeded into interview_scorecard_templates the first time a tenant's
// list is empty, rather than requiring a separate seed script. HR can still
// edit/add more via the same CRUD API afterward.
export const DEFAULT_SCORECARD_TEMPLATES = [
  {
    name: 'Technical Developer', category: 'TECHNICAL',
    criteria: ['Technical Knowledge', 'Problem Solving', 'Code Quality', 'System Thinking', 'Communication'],
  },
  {
    name: 'Managerial', category: 'MANAGERIAL',
    criteria: ['Leadership', 'Decision Making', 'Team Management', 'Strategic Thinking', 'Communication'],
  },
  {
    name: 'Sales', category: 'SALES',
    criteria: ['Sales Acumen', 'Negotiation', 'Product Knowledge', 'Communication', 'Target Orientation'],
  },
  {
    name: 'HR', category: 'HR',
    criteria: ['Policy Knowledge', 'Interpersonal Skills', 'Conflict Resolution', 'Communication'],
  },
  {
    name: 'Culture / Behavioral', category: 'CULTURAL',
    criteria: ['Values Alignment', 'Adaptability', 'Teamwork', 'Integrity'],
  },
  {
    name: 'Intern', category: 'INTERN',
    criteria: ['Fundamentals', 'Learning Aptitude', 'Communication', 'Enthusiasm'],
  },
]
