// Step 7 — AI Candidate Matching. There is no LLM/AI API key configured
// anywhere in this codebase (see lib/resumeParser.js's own callout), so
// "AI Match" is a transparent, deterministic rules engine — every score
// component is a plain formula over real job/candidate fields, not a
// black-box model. That's also exactly what the spec asks for: "Do not put
// this inside the AI black box. Make it obvious." The "AI" in the UI labels
// matches the spec's own wording; the mechanism behind it is rules, not
// machine learning.
export const MATCHING_MODEL_VERSION = 'rules-v1'
export const MATCHING_RULES_VERSION = 'rules-v1'

// How much each component contributes to the overall score. Not
// user-configurable yet (the spec only asks for label *thresholds* to be
// configurable later) — kept as one constant so it's the single place to
// retune.
export const MATCH_WEIGHTS = {
  skills: 0.30,
  experience: 0.20,
  education: 0.10,
  location: 0.10,
  ctc: 0.15,
  notice: 0.05,
  screening: 0.10,
}

// A job with no notice-period preference recorded falls back to this
// industry-standard default rather than skipping the component entirely.
export const DEFAULT_PREFERRED_NOTICE_DAYS = 30

export const MATCH_LABEL = { STRONG: 'STRONG_MATCH', GOOD: 'GOOD_MATCH', POTENTIAL: 'POTENTIAL_MATCH', LOW: 'LOW_MATCH' }
export const MATCH_LABEL_LABELS = {
  STRONG_MATCH: 'Strong Match', GOOD_MATCH: 'Good Match', POTENTIAL_MATCH: 'Potential Match', LOW_MATCH: 'Low Match',
}
// Kept as ordered thresholds (highest first) so getMatchLabel() below is the
// one place to touch if these numbers ever need to become tenant-configurable.
export const MATCH_LABEL_THRESHOLDS = [
  { min: 85, label: MATCH_LABEL.STRONG },
  { min: 70, label: MATCH_LABEL.GOOD },
  { min: 50, label: MATCH_LABEL.POTENTIAL },
  { min: 0, label: MATCH_LABEL.LOW },
]
export function getMatchLabel(score) {
  return MATCH_LABEL_THRESHOLDS.find((t) => score >= t.min).label
}

export const SCREENING_DECISION = {
  SHORTLIST: 'SHORTLIST', HOLD: 'HOLD', REJECT: 'REJECT', TALENT_POOL: 'TALENT_POOL',
}

// One reject action serves the Step 7 screening decision, the Step 8
// pipeline reject, and the Step 11 final-selection reject — a merge of all
// three steps' reason lists, minus "Candidate Withdrew" which has its own
// dedicated Withdraw flow (see WITHDRAWAL_REASON below) rather than being a
// reject reason. "Other" requires a comment — enforced server-side too.
export const REJECTION_REASON = {
  SKILLS_MISMATCH: 'Skills mismatch', EXPERIENCE_MISMATCH: 'Experience mismatch',
  ASSESSMENT: 'Assessment', INTERVIEW_FEEDBACK: 'Interview feedback',
  COMPENSATION_MISMATCH: 'Compensation mismatch', NOTICE_PERIOD: 'Notice period', LOCATION: 'Location',
  POSITION_CLOSED: 'Position closed', POSITION_FILLED: 'Position filled', POSITION_CANCELLED: 'Position cancelled',
  FAILED_SCREENING: 'Failed screening', NO_RESPONSE: 'No response', CANDIDATE_AVAILABILITY: 'Candidate availability',
  DUPLICATE_APPLICATION: 'Duplicate application', OTHER: 'Other',
}
export const REJECTION_REASON_LIST = Object.values(REJECTION_REASON)

// Step 8 §10 — Withdrawal is candidate-initiated, tracked separately from
// HR-initiated rejection so reporting doesn't conflate the two.
export const WITHDRAWAL_REASON = {
  ACCEPTED_ANOTHER_OFFER: 'Accepted another offer', NOT_INTERESTED: 'Not interested',
  SALARY_EXPECTATIONS: 'Salary expectations', LOCATION: 'Location',
  JOINING_TIMELINE: 'Joining timeline', PERSONAL_REASON: 'Personal reason', OTHER: 'Other',
}
export const WITHDRAWAL_REASON_LIST = Object.values(WITHDRAWAL_REASON)
