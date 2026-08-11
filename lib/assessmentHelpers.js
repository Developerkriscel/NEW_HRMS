// Step 9 — shared assessment orchestration: the secure tokenized-link
// mechanism, auto-grading, and score aggregation.
import jwt from 'jsonwebtoken'
import { AUTO_GRADABLE_TYPES, CANDIDATE_ASSESSMENT_STATUS } from './assessmentConstants'
import Tenant from '@/models/Tenant'

const JWT_SECRET = process.env.JWT_SECRET || 'NexaHRSuperSecretKey2025ForJWTTokenSigningMustBe256BitsOrMore'

// ---------------------------------------------------------------------------
// Secure link — /candidate/assessment/[token] carries no company slug, so
// the token itself has to be enough to resolve the right tenant's database
// without a global cross-tenant lookup table. A signed JWT does that: it's
// unforgeable without JWT_SECRET, and deliberately carries no exp claim of
// its own — the real deadline is candidate_assessments.expiresAt, enforced
// server-side on every access (see enforceExpiry below), never the token's
// own lifetime or the browser's countdown timer.
export function issueAssessmentToken(tenantId, candidateAssessmentId) {
  return jwt.sign(
    { tenantId: String(tenantId), candidateAssessmentId: String(candidateAssessmentId), purpose: 'candidate_assessment' },
    JWT_SECRET,
    { algorithm: 'HS256' }
  )
}

export async function resolveAssessmentToken(token) {
  let decoded
  try {
    decoded = jwt.verify(token, JWT_SECRET)
  } catch {
    return null
  }
  if (decoded?.purpose !== 'candidate_assessment' || !decoded.tenantId || !decoded.candidateAssessmentId) return null

  const tenant = await Tenant.findOne({ _id: decoded.tenantId, deleted: false })
  if (!tenant) return null
  return { tenant, candidateAssessmentId: decoded.candidateAssessmentId }
}

// Lazily transitions a stale attempt to EXPIRED the moment anything reads
// it past its deadline — there's no cron/scheduler in this codebase, so
// expiry is enforced on access rather than by a background job. Mutates
// and returns the same document; caller still needs to .save() if it
// changed anything else too.
const OPEN_STATUSES = [CANDIDATE_ASSESSMENT_STATUS.ASSIGNED, CANDIDATE_ASSESSMENT_STATUS.SENT, CANDIDATE_ASSESSMENT_STATUS.OPENED, CANDIDATE_ASSESSMENT_STATUS.IN_PROGRESS]
export function enforceExpiry(candidateAssessment) {
  if (!OPEN_STATUSES.includes(candidateAssessment.status)) return false
  const deadline = candidateAssessment.attemptDeadline || candidateAssessment.expiresAt
  if (deadline && new Date(deadline) < new Date()) {
    candidateAssessment.status = CANDIDATE_ASSESSMENT_STATUS.EXPIRED
    candidateAssessment.activityLog.push({ type: 'EXPIRED', message: 'Assessment expired before completion' })
    return true
  }
  return false
}

// ---------------------------------------------------------------------------
// Grading
// ---------------------------------------------------------------------------

function normalize(v) {
  return String(v ?? '').trim().toLowerCase()
}

// Returns { isAutoGraded, isCorrect, marksAwarded } for one answer against
// its question. Never throws on a malformed/missing answer — just scores
// it wrong, since candidates submit whatever a browser sends.
export function gradeAnswer(question, answer) {
  if (!AUTO_GRADABLE_TYPES.includes(question.type)) {
    return { isAutoGraded: false, isCorrect: null, marksAwarded: null }
  }

  let isCorrect = false
  if (question.type === 'SINGLE_CHOICE' || question.type === 'TRUE_FALSE') {
    isCorrect = answer != null && String(answer) === String(question.correctAnswer)
  } else if (question.type === 'MULTIPLE_CHOICE') {
    const correct = (Array.isArray(question.correctAnswer) ? question.correctAnswer : []).map(String).sort()
    const given = (Array.isArray(answer) ? answer : []).map(String).sort()
    isCorrect = correct.length > 0 && correct.length === given.length && correct.every((c, i) => c === given[i])
  } else if (question.type === 'NUMERIC') {
    isCorrect = answer !== null && answer !== undefined && Number(answer) === Number(question.correctAnswer)
  } else if (question.type === 'SHORT_ANSWER') {
    isCorrect = normalize(answer) === normalize(question.correctAnswer) && normalize(question.correctAnswer) !== ''
  }

  const marksAwarded = isCorrect ? question.marks : -(question.negativeMarks || 0)
  return { isAutoGraded: true, isCorrect, marksAwarded }
}

// Aggregates graded answer rows into overall score + a per-skillCategory
// breakdown ("Node.js 20/25") + whether anything still needs a human.
export function aggregateScore(gradedRows, questions) {
  const questionById = new Map(questions.map((q) => [String(q._id), q]))
  let score = 0
  let maxScore = 0
  let needsManualEval = false
  const breakdown = {}

  for (const row of gradedRows) {
    const q = questionById.get(String(row.questionId))
    if (!q) continue
    maxScore += q.marks
    const bucket = q.skillCategory || 'General'
    if (!breakdown[bucket]) breakdown[bucket] = { scored: 0, max: 0 }
    breakdown[bucket].max += q.marks

    if (row.isAutoGraded) {
      score += row.marksAwarded || 0
      breakdown[bucket].scored += Math.max(0, row.marksAwarded || 0)
    } else {
      needsManualEval = true
    }
  }

  const percentage = maxScore > 0 ? Math.round((Math.max(0, score) / maxScore) * 1000) / 10 : 0
  return { score, maxScore, percentage, breakdown, needsManualEval }
}

export function decideResult(percentage, passingScore) {
  if (passingScore == null) return 'PENDING'
  return percentage >= passingScore ? 'PASSED' : 'FAILED'
}

// Strips answer-key data before anything is sent to the public portal —
// candidates never see correctAnswer, isCorrect flags, or evaluation notes.
export function sanitizeQuestionForCandidate(question, options) {
  return {
    id: String(question._id),
    type: question.type,
    questionText: question.questionText,
    marks: question.marks,
    isRequired: question.isRequired,
    options: (options || []).map((o) => ({ id: String(o._id), text: o.text })),
  }
}
