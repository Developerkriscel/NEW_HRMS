// Step 7 — the actual scoring logic. Pure functions only (no DB access) so
// the rules are easy to read/verify in one place and to unit-test in
// isolation — lib/matchHelpers.js is what gathers real job/candidate data
// and calls generateMatch() below. See lib/matchingConstants.js's header
// comment for why this is a transparent rules engine, not an LLM call.
import { MATCH_WEIGHTS, DEFAULT_PREFERRED_NOTICE_DAYS, getMatchLabel } from './matchingConstants'

function norm(s) {
  return String(s || '').trim().toLowerCase()
}

function matchSkillList(list, candidateSet) {
  const matched = [], missing = []
  for (const skill of list) {
    if (candidateSet.has(norm(skill))) matched.push(skill)
    else missing.push(skill)
  }
  return { matched, missing }
}

export function computeSkillsScore(requiredSkills = [], preferredSkills = [], candidateSkillNames = []) {
  const candidateSet = new Set(candidateSkillNames.map(norm))
  const required = matchSkillList(requiredSkills, candidateSet)
  const preferred = matchSkillList(preferredSkills, candidateSet)

  const hasReq = requiredSkills.length > 0
  const hasPref = preferredSkills.length > 0
  let score
  if (!hasReq && !hasPref) {
    score = 100
  } else {
    const reqRatio = hasReq ? required.matched.length / requiredSkills.length : 1
    const prefRatio = hasPref ? preferred.matched.length / preferredSkills.length : 1
    const reqWeight = hasReq ? (hasPref ? 0.7 : 1) : 0
    const prefWeight = hasPref ? (hasReq ? 0.3 : 1) : 0
    score = Math.round(reqRatio * reqWeight * 100 + prefRatio * prefWeight * 100)
  }
  return { score, required, preferred, requiredTotal: requiredSkills.length, preferredTotal: preferredSkills.length }
}

export function computeExperienceScore(minExperience, maxExperience, candidateExperience) {
  if (candidateExperience == null) return { score: 50, message: null, withinRange: null }
  if (minExperience == null && maxExperience == null) return { score: 100, message: null, withinRange: true }

  const min = minExperience ?? 0
  const max = maxExperience ?? Infinity
  if (candidateExperience >= min && candidateExperience <= max) return { score: 100, message: null, withinRange: true }

  if (candidateExperience < min) {
    const gap = min - candidateExperience
    return {
      score: Math.max(20, Math.round(100 - gap * 25)),
      message: `Below required experience (${candidateExperience} yrs vs ${min}+ yrs required)`,
      withinRange: false, below: true,
    }
  }
  const gap = candidateExperience - max
  return {
    score: Math.max(70, Math.round(100 - gap * 5)),
    message: `More experienced than the role's typical range (${candidateExperience} yrs vs up to ${max} yrs)`,
    withinRange: false, above: true,
  }
}

// minEducation/preferredEducation are free-text ("Bachelor's in Computer
// Science or related field") — a loose keyword-overlap heuristic, honestly
// approximate like the rest of this engine.
export function computeEducationScore(minEducation, preferredEducation, candidateDegreeTexts = []) {
  if (!minEducation && !preferredEducation) return { score: 100, message: null, matched: true }
  if (!candidateDegreeTexts.length) return { score: 40, message: 'No education on file to verify against the requirement', matched: false }

  const text = norm(candidateDegreeTexts.join(' '))
  const requirementText = norm(`${minEducation || ''} ${preferredEducation || ''}`)
  const keywords = requirementText.split(/\W+/).filter((w) => w.length >= 4)
  if (!keywords.length) return { score: 80, message: null, matched: true }

  const hitCount = keywords.filter((k) => text.includes(k)).length
  const ratio = hitCount / keywords.length
  if (ratio >= 0.3) return { score: 100, message: null, matched: true }
  return { score: Math.max(50, Math.round(ratio * 100) + 30), message: 'Education on file doesn’t clearly match the stated requirement', matched: false }
}

export function computeLocationScore(workMode, jobLocationText, candidateLocation) {
  if (workMode === 'REMOTE') return { score: 100, message: null }
  if (!jobLocationText || !candidateLocation) return { score: 70, message: null }
  const a = norm(jobLocationText), b = norm(candidateLocation)
  if (a === b || a.includes(b) || b.includes(a)) return { score: 100, message: null }
  return { score: 40, message: `Candidate is based in ${candidateLocation}; role is based in ${jobLocationText}` }
}

export function computeCtcScore(minCtc, maxCtc, expectedCtc) {
  if (expectedCtc == null) return { score: 70, message: null, withinBudget: null }
  if (minCtc == null && maxCtc == null) return { score: 100, message: null, withinBudget: true }

  const max = maxCtc ?? Infinity
  if (expectedCtc <= max) return { score: 100, message: 'Within Budget', withinBudget: true }

  const over = Math.round((expectedCtc - max) * 10) / 10
  const score = Math.max(20, Math.round(100 - (over / max) * 100))
  return { score, message: `Above Budget by ₹${over} LPA`, withinBudget: false, overBy: over }
}

function parseNoticeDays(text) {
  if (!text) return null
  const t = norm(text)
  if (/immediate/.test(t)) return 0
  const monthMatch = t.match(/(\d+)\s*month/)
  if (monthMatch) return Number(monthMatch[1]) * 30
  const dayMatch = t.match(/(\d+)\s*(day|d\b)/)
  if (dayMatch) return Number(dayMatch[1])
  const numMatch = t.match(/(\d+)/)
  if (numMatch) return Number(numMatch[1])
  return null
}

export function computeNoticeScore(candidateNoticeText, preferredDays = DEFAULT_PREFERRED_NOTICE_DAYS) {
  const days = parseNoticeDays(candidateNoticeText)
  if (days == null) return { score: 70, message: null, days: null, withinPreferred: null }
  if (days <= preferredDays) return { score: 100, message: null, days, withinPreferred: true }

  const over = days - preferredDays
  const score = Math.max(30, Math.round(100 - (over / preferredDays) * 60))
  return { score, message: `Notice period is ${days} days (preferred: ≤${preferredDays} days)`, days, withinPreferred: false, overBy: over }
}

// Mirrors lib/candidateHelpers.js's computeScreeningResult but scores each
// answer individually instead of a single pass/fail.
function answerSatisfiesRule(answer) {
  if (!answer.isKnockout || !answer.rule) return true
  const rule = String(answer.rule).trim()
  const value = answer.answer
  if (answer.questionType === 'NUMBER') {
    const numericAnswer = Number(value)
    const minimum = Number(rule)
    if (Number.isFinite(numericAnswer) && Number.isFinite(minimum)) return numericAnswer >= minimum
    return true
  }
  if (answer.questionType === 'YES_NO') return norm(value) === norm(rule)
  const answerText = Array.isArray(value) ? value.join(', ') : String(value ?? '')
  return norm(answerText).includes(norm(rule))
}

export function computeScreeningScore(answers = []) {
  if (!answers.length) return { score: 100, matched: 0, total: 0, knockoutFailed: false }
  let matched = 0
  let knockoutFailed = false
  for (const a of answers) {
    const hasAnswer = a.answer !== null && a.answer !== undefined && String(a.answer).trim() !== ''
    const satisfiesRule = answerSatisfiesRule(a)
    if (hasAnswer && satisfiesRule) matched++
    else if (a.isKnockout && !satisfiesRule) knockoutFailed = true
  }
  return { score: Math.round((matched / answers.length) * 100), matched, total: answers.length, knockoutFailed }
}

// The single entry point lib/matchHelpers.js calls. Everything here is
// deterministic given the same inputs — running it twice on unchanged data
// produces the exact same result.
export function generateMatch(input) {
  const skills = computeSkillsScore(input.requiredSkills, input.preferredSkills, input.candidateSkillNames)
  const experience = computeExperienceScore(input.minExperience, input.maxExperience, input.candidateExperience)
  const education = computeEducationScore(input.minEducation, input.preferredEducation, input.candidateDegreeTexts)
  const location = computeLocationScore(input.workMode, input.jobLocationText, input.candidateLocation)
  const ctc = computeCtcScore(input.minCtc, input.maxCtc, input.candidateExpectedCtc)
  const notice = computeNoticeScore(input.candidateNoticeText, input.preferredNoticeDays)
  const screening = computeScreeningScore(input.screeningAnswers)

  const overallScore = Math.round(
    skills.score * MATCH_WEIGHTS.skills +
    experience.score * MATCH_WEIGHTS.experience +
    education.score * MATCH_WEIGHTS.education +
    location.score * MATCH_WEIGHTS.location +
    ctc.score * MATCH_WEIGHTS.ctc +
    notice.score * MATCH_WEIGHTS.notice +
    screening.score * MATCH_WEIGHTS.screening
  )

  const strengths = []
  const concerns = []

  for (const s of skills.required.matched) strengths.push(`${s} — required skill matched`)
  for (const s of skills.preferred.matched) strengths.push(`${s} — preferred skill matched`)
  if (education.matched && (input.minEducation || input.preferredEducation)) strengths.push('Required education matched')
  if (ctc.withinBudget) strengths.push('Expected CTC within budget')
  if (experience.withinRange && input.candidateExperience != null) strengths.push(`Experience fits requirement (${input.candidateExperience} yrs)`)
  if (notice.withinPreferred) strengths.push('Notice period within preferred window')
  if (screening.total > 0 && !screening.knockoutFailed && screening.matched === screening.total) strengths.push('All screening criteria matched')

  for (const s of skills.required.missing) concerns.push({ severity: 'CRITICAL', text: `${s} not found in resume` })
  for (const s of skills.preferred.missing) concerns.push({ severity: 'MODERATE', text: `${s} experience not clearly found` })
  if (experience.message) concerns.push({ severity: experience.below ? 'CRITICAL' : 'MODERATE', text: experience.message })
  if (!education.matched && education.message) concerns.push({ severity: 'MODERATE', text: education.message })
  if (location.message) concerns.push({ severity: 'MODERATE', text: location.message })
  if (ctc.message && !ctc.withinBudget) concerns.push({ severity: 'CRITICAL', text: ctc.message })
  if (notice.message) concerns.push({ severity: 'MODERATE', text: notice.message })
  if (screening.knockoutFailed) concerns.push({ severity: 'CRITICAL', text: 'Screening criteria not met (knockout question)' })

  const matchLabel = getMatchLabel(overallScore)

  return {
    overallScore,
    skillsScore: skills.score,
    experienceScore: experience.score,
    educationScore: education.score,
    locationScore: location.score,
    ctcScore: ctc.score,
    noticeScore: notice.score,
    screeningScore: screening.score,
    matchLabel,
    matchedSkills: { required: skills.required.matched, preferred: skills.preferred.matched },
    missingSkills: { required: skills.required.missing, preferred: skills.preferred.missing },
    strengths,
    concerns,
    breakdown: { skills, experience, education, location, ctc, notice, screening },
    summary: buildSummary({ input, skills, experience, ctc, notice, screening, overallScore, matchLabel }),
  }
}

// A short, templated paragraph — not an LLM call (see the module header),
// but reads like the spec's own example: role + years + top skills, what's
// met, what the main concern is.
function buildSummary({ input, skills, experience, ctc, notice, screening, matchLabel }) {
  const parts = []
  const role = input.candidateDesignation || 'Candidate'
  const expPart = input.candidateExperience != null ? `with approximately ${input.candidateExperience} years of experience` : 'with experience not specified on the profile'
  const topSkills = skills.required.matched.concat(skills.preferred.matched).slice(0, 3)
  const skillsPart = topSkills.length ? ` in ${topSkills.join(', ')}` : ''
  parts.push(`${role} ${expPart}${skillsPart}.`)

  if (skills.required.missing.length === 0 && skills.requiredTotal > 0) {
    parts.push('Meets all required technical skills.')
  } else if (skills.required.missing.length > 0) {
    parts.push(`Missing ${skills.required.missing.length} required skill${skills.required.missing.length > 1 ? 's' : ''} (${skills.required.missing.join(', ')}).`)
  }

  if (ctc.withinBudget) parts.push('Compensation expectations are within budget.')
  else if (ctc.withinBudget === false) parts.push('Compensation expectations exceed the budgeted range.')

  const concernBits = []
  if (!notice.withinPreferred && notice.days != null) concernBits.push(`a ${notice.days}-day notice period against the preferred ${input.preferredNoticeDays || 30} days`)
  if (experience.below) concernBits.push('experience below the stated requirement')
  if (screening.knockoutFailed) concernBits.push('a failed screening criterion')
  if (concernBits.length) parts.push(`Main concern is ${concernBits[0]}.`)

  return parts.join(' ')
}
