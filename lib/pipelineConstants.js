// Step 8 — ATS Recruitment Pipeline.
import { CANDIDATE_MANAGE_ROLES, CANDIDATE_VIEW_ROLES } from './candidateConstants'

export const STAGE_HISTORY_ACTION = {
  CREATED: 'CREATED', MOVED: 'MOVED', SHORTLISTED: 'SHORTLISTED', HELD: 'HELD', RESUMED: 'RESUMED',
  REJECTED: 'REJECTED', WITHDRAWN: 'WITHDRAWN', TALENT_POOL: 'TALENT_POOL',
}

export const PIPELINE_PERMISSIONS = {
  VIEW: 'pipeline.view',
  MOVE_CANDIDATE: 'pipeline.move_candidate',
  REJECT: 'candidate.reject',
  HOLD: 'candidate.hold',
  TALENT_POOL: 'candidate.talent_pool',
  ASSIGN_RECRUITER: 'candidate.assign_recruiter',
  BULK_ACTION: 'candidate.bulk_action',
}

// Same broad-vs-narrow split as the rest of the recruitment module —
// viewing the board/candidates rides on CANDIDATE_VIEW_ROLES, every action
// that mutates state rides on CANDIDATE_MANAGE_ROLES.
export const PIPELINE_VIEW_ROLES = CANDIDATE_VIEW_ROLES
export const PIPELINE_MANAGE_ROLES = CANDIDATE_MANAGE_ROLES

export function canManagePipeline(session) {
  return CANDIDATE_MANAGE_ROLES.includes(session.role)
}

// Suggested starter tags (item 15's example list) — HR can still create any
// other tag name via the same "create if missing" endpoint.
export const SUGGESTED_TAGS = [
  'Strong Backend', 'Immediate Joiner', 'Referral', 'Senior', 'AWS', 'Good Communication', 'Future Opportunity',
]

const TAG_COLORS = [
  'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'bg-pink-50 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  'bg-cyan-50 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
]
// Deterministic color per tag name — no color field stored on the tag
// itself, just derived at render time from the name.
export function tagColorClass(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return TAG_COLORS[hash % TAG_COLORS.length]
}
