// Step 6 orchestration — resume upload -> parse -> persist -> HR review ->
// apply-to-profile. There's no job-queue/worker infra anywhere in this
// codebase (same reality already noted for "Notify HR" in Step 5's apply
// route), so parsing runs in-process. It's still genuinely asynchronous
// from the candidate's point of view: the route that uploads the resume
// *starts* runParseAndPersist() and returns its response without awaiting
// it, so the application succeeds immediately and parsing continues after
// the response has been sent (this app runs as a persistent `next
// dev`/`next start` Node process — not a serverless function that gets
// frozen the instant a response is returned — which is exactly why local
// disk resume storage in lib/resumeStorage.js is a safe assumption too).
import path from 'path'
import { saveResumeFile, validateResumeFile } from './resumeStorage'
import { runResumeParser, PARSER_VERSION } from './resumeParser'
import {
  RESUME_PARSING_STATUS, ACTIVITY_ENTRY_TYPE, PERSONAL_REVIEW_FIELDS, PROFILE_SECTIONS,
} from './candidateConstants'
import CandidateResume from '@/models/CandidateResume'
import CandidateSkill from '@/models/CandidateSkill'
import CandidateExperience from '@/models/CandidateExperience'
import CandidateEducation from '@/models/CandidateEducation'
import CandidateCertification from '@/models/CandidateCertification'
import CandidateProject from '@/models/CandidateProject'
import Candidate from '@/models/Candidate'

const SECTION_MODELS = {
  skills: CandidateSkill,
  experience: CandidateExperience,
  education: CandidateEducation,
  certifications: CandidateCertification,
  projects: CandidateProject,
}

function logCandidateActivity(candidate, type, message, actorName) {
  candidate.activityLog.push({ type, message, actorName: actorName || 'System' })
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

// candidateId may be null — a resume can be uploaded as a "draft" ahead of
// the Candidate record existing (see the Manual Candidate Entry flow: HR
// uploads a resume first, parses it, and uses the result to auto-fill the
// Add Candidate form before anything is saved).
export async function createResumeRecord({ tenantId, candidateId, candidateCode, applicationId, file, uploadSource }) {
  const validationError = validateResumeFile(file)
  if (validationError) {
    const err = new Error(validationError)
    err.status = 400
    err.errorCode = 'VALIDATION_ERROR'
    throw err
  }

  const filenameSeed = candidateCode || (candidateId ? String(candidateId).slice(-8) : `draft-${Date.now()}`)
  const upload = await saveResumeFile(file, tenantId, filenameSeed)
  const ext = (file.name?.split('.').pop() || '').toLowerCase()

  let version = 1
  if (candidateId) {
    const existingCount = await CandidateResume.countDocuments({ tenantId, candidateId })
    version = existingCount + 1
    if (existingCount > 0) await CandidateResume.updateMany({ tenantId, candidateId }, { isPrimary: false })
  }

  return CandidateResume.create({
    tenantId,
    candidateId: candidateId || null,
    applicationId: applicationId || null,
    fileUrl: upload.url,
    fileName: upload.filename,
    originalFileName: file.name || null,
    fileExt: ext,
    sizeBytes: file.size || null,
    version,
    isPrimary: true,
    uploadSource: uploadSource || 'APPLICATION',
    parsingStatus: RESUME_PARSING_STATUS.UPLOADED,
  })
}

// Points a previously-draft resume (candidateId: null) at the Candidate
// that was just created from it — used by the Manual Candidate Entry flow.
export async function claimDraftResume(resumeId, tenantId, candidateId) {
  const resume = await CandidateResume.findOne({ _id: resumeId, tenantId, candidateId: null })
  if (!resume) return null
  await CandidateResume.updateMany({ tenantId, candidateId }, { isPrimary: false })
  resume.candidateId = candidateId
  resume.isPrimary = true
  resume.version = (await CandidateResume.countDocuments({ tenantId, candidateId, _id: { $ne: resume._id } })) + 1
  await resume.save()
  return resume
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

// Never throws — resume parsing failure must never block a candidate
// application or a manual-add flow (Step 6 rule). Every failure mode ends
// with the CandidateResume row set to FAILED instead.
export async function runParseAndPersist(resumeId, tenantId) {
  try {
    const resume = await CandidateResume.findOne({ _id: resumeId, tenantId })
    if (!resume) return null

    const candidate = resume.candidateId ? await Candidate.findOne({ _id: resume.candidateId, tenantId, deleted: false }) : null

    if (candidate) {
      logCandidateActivity(candidate, ACTIVITY_ENTRY_TYPE.RESUME_PARSING_STARTED, `Resume parsing started (${resume.originalFileName || resume.fileName})`)
      await candidate.save()
    }

    resume.parsingStatus = RESUME_PARSING_STATUS.PARSING
    await resume.save()

    const absolutePath = path.join(process.cwd(), 'output', 'resumes', String(tenantId), resume.fileName)
    const result = await runResumeParser(absolutePath, resume.fileExt)

    resume.parsingStatus = result.status
    resume.parsedData = result.parsedData
    resume.errorMessage = result.errorMessage
    resume.parserVersion = PARSER_VERSION
    resume.parsedAt = new Date()

    if (candidate && result.status !== RESUME_PARSING_STATUS.FAILED) {
      // Duplicate-identity detection — the resume text names an email that
      // belongs to a *different* existing candidate. Flag only; never
      // auto-merge (spec: "Candidate merge logic can be enhanced later").
      const extractedEmail = result.parsedData?.personal?.email?.toLowerCase()
      if (extractedEmail && extractedEmail !== candidate.email?.toLowerCase()) {
        const other = await Candidate.findOne({ tenantId, deleted: false, email: extractedEmail, _id: { $ne: candidate._id } })
        if (other) {
          resume.possibleDuplicateOf = other._id
          logCandidateActivity(candidate, ACTIVITY_ENTRY_TYPE.DUPLICATE_FLAGGED, `This resume's email (${extractedEmail}) matches an existing candidate (${other.getFullName()}) — possible duplicate identity flagged for review`)
        }
      }
    }

    if (candidate) {
      if (result.status === RESUME_PARSING_STATUS.FAILED) {
        logCandidateActivity(candidate, ACTIVITY_ENTRY_TYPE.RESUME_PARSE_FAILED, `Resume parsing failed: ${result.errorMessage}`)
      } else if (result.status === RESUME_PARSING_STATUS.PARSED) {
        logCandidateActivity(candidate, ACTIVITY_ENTRY_TYPE.RESUME_PARSED, 'Resume parsed successfully — candidate information extracted, awaiting HR review')
      } else {
        logCandidateActivity(candidate, ACTIVITY_ENTRY_TYPE.RESUME_PARSED, 'Resume parsed with low confidence — flagged for review')
      }
      await candidate.save()
    }

    await resume.save()

    // Step 7 — "Resume Parsed -> AI Match" happens without HR clicking
    // anything, same fire-and-forget shape as the parse itself. Only when
    // this resume actually belongs to an application (not a draft/manual
    // upload with nothing to match against yet).
    if (resume.applicationId && result.status !== RESUME_PARSING_STATUS.FAILED) {
      const { triggerBackgroundMatch } = await import('./matchHelpers')
      triggerBackgroundMatch(resume.applicationId, tenantId)
    }

    return resume
  } catch (err) {
    console.error('Resume parsing failed unexpectedly', err)
    try {
      await CandidateResume.updateOne(
        { _id: resumeId, tenantId },
        { parsingStatus: RESUME_PARSING_STATUS.FAILED, errorMessage: 'An unexpected error occurred while parsing this resume.', parsedAt: new Date() }
      )
    } catch (innerErr) {
      console.error('Failed to record resume parsing failure', innerErr)
    }
    return null
  }
}

// Starts parsing without making the caller wait for it — call this, do not
// await it, from any route that must return before parsing finishes.
export function triggerBackgroundParse(resumeId, tenantId) {
  runParseAndPersist(resumeId, tenantId).catch((err) => console.error('Background resume parse failed', err))
}

// ---------------------------------------------------------------------------
// Review — comparing "Candidate Entered" vs "Resume Extracted"
// ---------------------------------------------------------------------------

function normalizeForCompare(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim().toLowerCase()
}

export async function buildParsedDataReview(resume, candidate) {
  const parsed = resume.parsedData || {}
  const applied = new Set(resume.appliedFields || [])

  const personal = PERSONAL_REVIEW_FIELDS.map(({ key, candidateField, label }) => {
    const extractedValue = key === 'name' ? parsed.personal?.name : parsed.personal?.[key]
    const existingValue = key === 'name' ? candidate?.getFullName?.() || candidate?.firstName : candidate?.[candidateField]
    const confidence = parsed.confidence?.personal?.[key] ?? null
    return {
      key,
      label,
      existingValue: existingValue ?? null,
      extractedValue: extractedValue ?? null,
      confidence,
      differs: extractedValue != null && normalizeForCompare(extractedValue) !== normalizeForCompare(existingValue),
      applied: applied.has(`personal.${key}`),
    }
  }).filter((row) => row.extractedValue !== null && row.extractedValue !== '')

  const existingByCandidate = candidate ? await Promise.all(PROFILE_SECTIONS.map(async ({ key }) => {
    const Model = SECTION_MODELS[key]
    const rows = await Model.find({ tenantId: candidate.tenantId, candidateId: candidate._id }).lean()
    return [key, rows]
  })) : []
  const existingMap = Object.fromEntries(existingByCandidate)

  const sections = PROFILE_SECTIONS.map(({ key, label }) => {
    const items = parsed[key] || []
    const existingRows = existingMap[key] || []
    const decorated = items.map((item, index) => ({
      ...item,
      index,
      alreadyExists: itemAlreadyExists(key, item, existingRows),
    }))
    return {
      key,
      label,
      items: decorated,
      totalCount: decorated.length,
      newCount: decorated.filter((i) => !i.alreadyExists).length,
      applied: applied.has(key),
    }
  }).filter((s) => s.totalCount > 0)

  return {
    resumeId: String(resume._id),
    parsingStatus: resume.parsingStatus,
    parserVersion: resume.parserVersion,
    parsedAt: resume.parsedAt,
    errorMessage: resume.errorMessage,
    possibleDuplicateOf: resume.possibleDuplicateOf,
    duplicateDismissed: resume.duplicateDismissed,
    personal,
    sections,
    appliedFields: resume.appliedFields || [],
  }
}

function itemAlreadyExists(sectionKey, item, existingRows) {
  const norm = (v) => normalizeForCompare(v)
  if (sectionKey === 'skills') return existingRows.some((r) => norm(r.skillName) === norm(item.skillName))
  if (sectionKey === 'experience') return existingRows.some((r) => norm(r.companyName) === norm(item.companyName) && norm(r.designation) === norm(item.designation))
  if (sectionKey === 'education') return existingRows.some((r) => norm(r.degree) === norm(item.degree) && norm(r.institution) === norm(item.institution))
  if (sectionKey === 'certifications') return existingRows.some((r) => norm(r.name) === norm(item.name))
  if (sectionKey === 'projects') return existingRows.some((r) => norm(r.name) === norm(item.name))
  return false
}

// ---------------------------------------------------------------------------
// Apply — HR-confirmed merge into the candidate profile. Never automatic.
// ---------------------------------------------------------------------------

const PERSONAL_FIELD_KEYS = new Set(PERSONAL_REVIEW_FIELDS.map((f) => f.key))
const SECTION_KEYS = new Set(PROFILE_SECTIONS.map((s) => s.key))

export async function applyParsedDataToCandidate({ resume, candidate, fields, session }) {
  const parsed = resume.parsedData || {}
  const appliedNow = []
  const actorName = session?.sub || 'HR'

  for (const field of fields) {
    if (PERSONAL_FIELD_KEYS.has(field)) {
      if (field === 'name') {
        const fullName = parsed.personal?.name
        if (fullName) {
          const parts = fullName.trim().split(/\s+/)
          candidate.firstName = parts[0]
          candidate.lastName = parts.slice(1).join(' ')
          appliedNow.push('personal.name')
        }
      } else {
        const reviewField = PERSONAL_REVIEW_FIELDS.find((f) => f.key === field)
        const value = parsed.personal?.[field]
        if (value !== undefined && value !== null && value !== '') {
          candidate[reviewField.candidateField] = value
          appliedNow.push(`personal.${field}`)
        }
      }
      continue
    }

    if (SECTION_KEYS.has(field)) {
      const Model = SECTION_MODELS[field]
      const items = parsed[field] || []
      const existingRows = await Model.find({ tenantId: candidate.tenantId, candidateId: candidate._id }).lean()
      const newRows = items
        .filter((item) => !itemAlreadyExists(field, item, existingRows))
        .map((item) => buildSectionDoc(field, item, candidate, resume))
      if (newRows.length) await Model.insertMany(newRows)
      appliedNow.push(field)
    }
  }

  resume.appliedFields = Array.from(new Set([...(resume.appliedFields || []), ...appliedNow]))
  resume.reviewedAt = new Date()
  resume.reviewedBy = session?.sub || null
  await resume.save()

  logCandidateActivity(candidate, ACTIVITY_ENTRY_TYPE.RESUME_REVIEWED, `Extracted resume data reviewed by HR (${fields.join(', ')})`, actorName)
  logCandidateActivity(candidate, ACTIVITY_ENTRY_TYPE.PROFILE_UPDATED, 'Candidate profile updated from resume extraction', actorName)
  candidate.updatedBy = session?.sub || candidate.updatedBy
  await candidate.save()

  return { appliedFields: appliedNow }
}

function buildSectionDoc(sectionKey, item, candidate, resume) {
  const base = { tenantId: candidate.tenantId, candidateId: candidate._id, resumeId: resume._id, source: 'RESUME', confidence: item.confidence ?? null }
  if (sectionKey === 'skills') return { ...base, skillName: item.skillName, yearsOfExperience: item.yearsOfExperience ?? null, isVerified: false }
  if (sectionKey === 'experience') {
    return {
      ...base, companyName: item.companyName, designation: item.designation,
      startDate: item.startDate || null, endDate: item.endDate || null, isCurrent: !!item.isCurrent, description: item.description || null,
    }
  }
  if (sectionKey === 'education') {
    return {
      ...base, degree: item.degree, specialization: item.specialization || null, institution: item.institution || null,
      startYear: item.startYear || null, endYear: item.endYear || null, score: item.score || null, scoreType: item.scoreType || null,
    }
  }
  if (sectionKey === 'certifications') {
    return { ...base, name: item.name, issuer: item.issuer || null }
  }
  if (sectionKey === 'projects') {
    return { ...base, name: item.name, description: item.description || null, technologies: item.technologies || [], projectUrl: item.projectUrl || null }
  }
  return base
}
