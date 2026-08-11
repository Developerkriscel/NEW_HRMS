// Step 7 — gathers real job + candidate data and calls the pure scoring
// engine (lib/matchingEngine.js), then persists the result. Kept separate
// from the engine so the scoring formulas stay easy to read/verify without
// wading through DB queries.
import { generateMatch } from './matchingEngine'
import { MATCHING_MODEL_VERSION, MATCHING_RULES_VERSION, DEFAULT_PREFERRED_NOTICE_DAYS } from './matchingConstants'
import { ACTIVITY_ENTRY_TYPE } from './candidateConstants'
import Application from '@/models/Application'
import ApplicationAnswer from '@/models/ApplicationAnswer'
import Candidate from '@/models/Candidate'
import CandidateJobMatch from '@/models/CandidateJobMatch'
import CandidateResume from '@/models/CandidateResume'
import CandidateSkill from '@/models/CandidateSkill'
import CandidateEducation from '@/models/CandidateEducation'
import Job from '@/models/Job'
import JobSkill from '@/models/JobSkill'
import Branch from '@/models/Branch'

// Matching reads from whichever candidate data is richest: HR-reviewed
// CandidateSkill/CandidateEducation rows (Step 6's "accept parsed data"
// flow) if present, otherwise the primary resume's parsedData directly —
// so a match can be generated the moment a resume is parsed, without
// forcing HR to review-and-accept first. This never writes back to the
// profile; it's read-only, matching is advisory (Step 6's "never blindly
// overwrite" rule stays about the *profile*, not about what matching is
// allowed to look at).
async function gatherCandidateSkillNames(tenantId, candidateId, primaryResume) {
  const rows = await CandidateSkill.find({ tenantId, candidateId }).select('skillName').lean()
  if (rows.length) return rows.map((r) => r.skillName)
  return (primaryResume?.parsedData?.skills || []).map((s) => s.skillName)
}

async function gatherCandidateDegreeTexts(tenantId, candidateId, primaryResume) {
  const rows = await CandidateEducation.find({ tenantId, candidateId }).select('degree specialization').lean()
  if (rows.length) return rows.map((r) => `${r.degree} ${r.specialization || ''}`.trim())
  return (primaryResume?.parsedData?.education || []).map((e) => e.degree).filter(Boolean)
}

// Builds the full input the engine needs, generates the match, and upserts
// candidate_job_matches (one row per application). Returns the saved doc.
export async function generateMatchForApplication(applicationId, tenantId, { actorName } = {}) {
  const application = await Application.findOne({ _id: applicationId, tenantId, deleted: false })
  if (!application) return null

  const [candidate, job] = await Promise.all([
    Candidate.findOne({ _id: application.candidateId, tenantId, deleted: false }),
    Job.findOne({ _id: application.jobId, tenantId, deleted: false }).populate('location', 'city name'),
  ])
  if (!candidate || !job) return null

  const [jobSkills, answers, primaryResume] = await Promise.all([
    JobSkill.find({ tenantId, jobId: job._id }).lean(),
    ApplicationAnswer.find({ tenantId, applicationId: application._id }).lean(),
    CandidateResume.findOne({ tenantId, candidateId: candidate._id, isPrimary: true }).lean(),
  ])

  const requiredSkills = jobSkills.filter((s) => s.type === 'REQUIRED').map((s) => s.skillName)
  const preferredSkills = jobSkills.filter((s) => s.type === 'PREFERRED').map((s) => s.skillName)

  const [candidateSkillNames, candidateDegreeTexts] = await Promise.all([
    gatherCandidateSkillNames(tenantId, candidate._id, primaryResume),
    gatherCandidateDegreeTexts(tenantId, candidate._id, primaryResume),
  ])

  const result = generateMatch({
    requiredSkills, preferredSkills, candidateSkillNames,
    minExperience: job.minExperience ?? null, maxExperience: job.maxExperience ?? null,
    candidateExperience: candidate.totalExperience ?? null,
    minEducation: job.minEducation || null, preferredEducation: job.preferredEducation || null, candidateDegreeTexts,
    workMode: job.workMode || null, jobLocationText: job.location?.city || job.location?.name || null, candidateLocation: candidate.currentLocation || null,
    minCtc: job.internalMinCtc ?? null, maxCtc: job.internalMaxCtc ?? null, candidateExpectedCtc: candidate.expectedCtc ?? null,
    candidateNoticeText: candidate.noticePeriod || null, preferredNoticeDays: DEFAULT_PREFERRED_NOTICE_DAYS,
    screeningAnswers: answers,
    candidateDesignation: candidate.currentDesignation,
  })

  const match = await CandidateJobMatch.findOneAndUpdate(
    { tenantId, applicationId: application._id },
    {
      tenantId, candidateId: candidate._id, applicationId: application._id, jobId: job._id,
      overallScore: result.overallScore, skillsScore: result.skillsScore, experienceScore: result.experienceScore,
      educationScore: result.educationScore, locationScore: result.locationScore, ctcScore: result.ctcScore,
      noticeScore: result.noticeScore, screeningScore: result.screeningScore,
      matchLabel: result.matchLabel, matchedSkills: result.matchedSkills, missingSkills: result.missingSkills,
      strengths: result.strengths, concerns: result.concerns, summary: result.summary,
      modelVersion: MATCHING_MODEL_VERSION, rulesVersion: MATCHING_RULES_VERSION,
      jobVersion: job.updatedAt, resumeId: primaryResume?._id || null, resumeVersion: primaryResume?.version || null,
      generatedAt: new Date(),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  application.activityLog.push({
    type: ACTIVITY_ENTRY_TYPE.UPDATED,
    message: `AI match generated — ${result.overallScore}% (${result.matchLabel.replace('_', ' ')})`,
    actorName: actorName || 'System',
  })
  await application.save()

  return match
}

// Fire-and-forget wrapper — same pattern as
// candidateProfileHelpers.triggerBackgroundParse, used right after resume
// parsing finishes so "AI Match" appears without HR clicking anything.
export function triggerBackgroundMatch(applicationId, tenantId) {
  if (!applicationId) return
  generateMatchForApplication(applicationId, tenantId).catch((err) => console.error('Background match generation failed', err))
}
