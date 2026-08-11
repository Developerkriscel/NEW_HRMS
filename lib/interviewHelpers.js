// Step 10 — shared interview scheduling/feedback orchestration.
import { INTERVIEW_ACTIVE_STATUSES, DEFAULT_SCORECARD_TEMPLATES, RECOMMENDATION_WEIGHT, consensusFromAverageWeight } from './interviewConstants'
import { CANDIDATE_MANAGE_ROLES } from './candidateConstants'
import Interview from '@/models/Interview'
import InterviewPanelMember from '@/models/InterviewPanelMember'
import InterviewScorecardTemplate from '@/models/InterviewScorecardTemplate'
import InterviewScorecardCriterion from '@/models/InterviewScorecardCriterion'
import InterviewFeedback from '@/models/InterviewFeedback'

// Two time ranges (same date, "HH:mm" strings) overlap.
function timesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA
}

// Internal-schedule conflict check ("otherwise use internal interview
// schedule conflicts at minimum" — no calendar integration exists in this
// codebase, so this is the whole implementation, not a fallback path).
export async function checkAvailability(tenantId, employeeIds, date, startTime, endTime, excludeInterviewId) {
  const dayStart = new Date(date); dayStart.setUTCHours(0, 0, 0, 0)
  const dayEnd = new Date(date); dayEnd.setUTCHours(23, 59, 59, 999)

  const query = { tenantId, date: { $gte: dayStart, $lte: dayEnd }, status: { $in: INTERVIEW_ACTIVE_STATUSES } }
  if (excludeInterviewId) query._id = { $ne: excludeInterviewId }

  const sameDayInterviews = await Interview.find(query).select('_id roundName startTime endTime candidateId').lean()
  const interviewIds = sameDayInterviews.map((i) => i._id)
  const panelRows = await InterviewPanelMember.find({ tenantId, interviewId: { $in: interviewIds }, employeeId: { $in: employeeIds } }).lean()
  const interviewById = new Map(sameDayInterviews.map((i) => [String(i._id), i]))

  const results = {}
  for (const employeeId of employeeIds) {
    const conflicts = []
    for (const p of panelRows) {
      if (String(p.employeeId) !== String(employeeId)) continue
      const iv = interviewById.get(String(p.interviewId))
      if (iv && timesOverlap(startTime, endTime, iv.startTime, iv.endTime)) {
        conflicts.push({ interviewId: iv._id, roundName: iv.roundName, startTime: iv.startTime, endTime: iv.endTime })
      }
    }
    results[employeeId] = { available: conflicts.length === 0, conflicts }
  }
  return results
}

// Auto-seeds the tenant's reusable scorecard templates the first time
// they're needed, instead of a separate seed script/admin screen — "then
// jobs can reuse templates" holds true from the very first use.
export async function ensureDefaultScorecardTemplates(tenantId) {
  const count = await InterviewScorecardTemplate.countDocuments({ tenantId })
  if (count > 0) return

  for (const tpl of DEFAULT_SCORECARD_TEMPLATES) {
    const doc = await InterviewScorecardTemplate.create({
      tenantId, name: tpl.name, category: tpl.category, isDefault: true, createdByName: 'System',
    })
    await InterviewScorecardCriterion.insertMany(
      tpl.criteria.map((name, i) => ({ tenantId, templateId: doc._id, name, maxScore: 10, order: i }))
    )
  }
}

// Blind feedback (item 14): an interviewer who hasn't submitted their own
// feedback yet never sees anyone else's — only whether each panelist has
// submitted, not the content. Broad HR roles always see everything, for
// oversight (a plain interviewer's own general HRMS role might just be
// EMPLOYEE/MANAGER, so this is a *separate* check from the usual
// CANDIDATE_MANAGE_ROLES gate on every other recruitment write).
export function canSeeAllFeedback(session, hasSubmittedOwn) {
  return CANDIDATE_MANAGE_ROLES.includes(session.role) || hasSubmittedOwn
}

export async function isPanelMember(tenantId, interviewId, employeeId) {
  const row = await InterviewPanelMember.findOne({ tenantId, interviewId, employeeId })
  return !!row
}

// Panel Feedback Summary — average + consensus, never an auto-select.
export function summarizePanelFeedback(feedbackRows) {
  if (!feedbackRows.length) return { average: null, consensus: null, count: 0 }
  const totalWeight = feedbackRows.reduce((sum, f) => sum + (RECOMMENDATION_WEIGHT[f.recommendation] ?? 0), 0)
  const averageWeight = totalWeight / feedbackRows.length
  const averageRating = Math.round((feedbackRows.reduce((sum, f) => sum + f.overallRating, 0) / feedbackRows.length) * 10) / 10
  return { averageRating, consensus: consensusFromAverageWeight(averageWeight), count: feedbackRows.length }
}
