export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { CANDIDATE_MANAGE_ROLES } from '@/lib/candidateConstants'
import { createResumeRecord, runParseAndPersist } from '@/lib/candidateProfileHelpers'

const MAX_BULK_RESUMES = 20

function extractCleanNameFromFilename(filename) {
  if (!filename) return null
  const base = String(filename)
    .replace(/\.[a-zA-Z0-9]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b(resume|cv|final|new|updated|developer|fullstack|software|it|sales|doc|pdf)\b/gi, '')
    .trim()
  if (base.length >= 3 && base.length <= 40) {
    return base
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ')
  }
  return null
}

const INVALID_NAME_HEADERS = /^(core sales skills|curriculum vitae|resume|profile summary|contact me|personal details|technical skills|work experience|career objective|about me|professional summary|summary|education|skills)$/i

function resolveCandidateName(parsed, filename) {
  const personalName = parsed?.personal?.name ? String(parsed.personal.name).trim() : ''
  if (personalName && !INVALID_NAME_HEADERS.test(personalName) && personalName.length >= 2 && personalName.length <= 45) {
    return personalName
  }
  const cleanFromFilename = extractCleanNameFromFilename(filename)
  if (cleanFromFilename) return cleanFromFilename
  return personalName || 'Candidate'
}

function resolveCandidateRole(parsed) {
  let role = parsed?.personal?.currentDesignation ? String(parsed.personal.currentDesignation).trim() : ''
  if (role && /based access control|collaborate|responsible|project|summary|overview/i.test(role)) {
    role = ''
  }
  if (!role && Array.isArray(parsed?.experience)) {
    for (const exp of parsed.experience) {
      const text = `${exp.designation || ''} ${exp.companyName || ''}`
      const match = text.match(/\b(Full\s*Stack\s*Developer|Software\s*(?:Engineer|Developer)|Frontend\s*(?:Engineer|Developer)|Backend\s*(?:Engineer|Developer)|Web\s*Developer|React\s*Developer|Node\.?js\s*Developer|Python\s*Developer|Java\s*Developer|QA\s*Engineer|DevOps\s*Engineer|Product\s*Manager|Project\s*Manager|Sales\s*(?:Executive|Manager)|Marketing\s*(?:Executive|Manager)|Business\s*Development)\b/i)
      if (match) {
        role = match[1]
        break
      }
    }
  }
  return role || ''
}

function resolveTotalExperience(parsed) {
  const explicit = parsed?.personal?.totalExperience
  if (explicit != null && Number.isFinite(Number(explicit)) && Number(explicit) > 0) {
    return Number(explicit)
  }
  if (Array.isArray(parsed?.experience) && parsed.experience.length > 0) {
    let totalMonths = 0
    for (const item of parsed.experience) {
      if (item.startDate) {
        const start = new Date(item.startDate)
        const end = item.endDate ? new Date(item.endDate) : new Date()
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
        if (months > 0 && months < 300) {
          totalMonths += months
        }
      }
    }
    if (totalMonths > 0) {
      return Math.round((totalMonths / 12) * 10) / 10
    }
    return Math.min(3, Math.max(1, parsed.experience.length))
  }
  return null
}

function candidateFromParsedResume(resume, parsed) {
  const personal = parsed?.personal || {}
  const name = resolveCandidateName(parsed, resume.originalFileName || resume.fileName)
  const role = resolveCandidateRole(parsed)
  const totalExp = resolveTotalExperience(parsed)

  return {
    id: String(resume._id),
    name,
    email: personal.email || '',
    phone: personal.phone || '',
    exp: totalExp ? `${totalExp} Years` : null,
    totalExperience: totalExp ?? null,
    role: role || personal.currentDesignation || '',
    location: personal.currentLocation || '',
    currentLocation: personal.currentLocation || '',
    currentCompany: personal.currentCompany || '',
    currentDesignation: role || personal.currentDesignation || '',
    score: null,
    skills: (parsed?.skills || []).map((skill) => skill.skillName).filter(Boolean).slice(0, 25),
    education: (parsed?.education || []).map((item) => item.degree).filter(Boolean).slice(0, 5),
    educationText: (parsed?.education || []).map((item) => item.degree).filter(Boolean).join(', '),
    experience: (parsed?.experience || [])
      .map((item) => `${item.designation || ''}${item.companyName ? ` at ${item.companyName}` : ''}`.trim())
      .filter(Boolean)
      .slice(0, 5),
    source: 'RESUME',
    draftResumeId: String(resume._id),
    resumeFileName: resume.originalFileName || resume.fileName,
    linkedinUrl: personal.linkedinUrl || null,
    githubUrl: personal.githubUrl || null,
  }
}

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)

  const formData = await req.formData()
  const files = [
    ...formData.getAll('resumes'),
    ...formData.getAll('resume'),
  ].filter((file) => file && typeof file !== 'string')

  if (!files.length) return fail('Please upload at least one resume file', 400, 'VALIDATION_ERROR')
  if (files.length > MAX_BULK_RESUMES) {
    return fail(`You can upload up to ${MAX_BULK_RESUMES} resumes at a time`, 400, 'VALIDATION_ERROR')
  }

  const candidates = []
  const failures = []

  for (const file of files) {
    try {
      const resumeRecord = await createResumeRecord({
        tenantId,
        candidateId: null,
        applicationId: null,
        file,
        uploadSource: 'MANUAL_HR',
      })
      const parsedResume = await runParseAndPersist(resumeRecord._id, tenantId)
      if (!parsedResume?.parsedData || parsedResume.parsingStatus === 'FAILED') {
        failures.push({
          fileName: file.name || resumeRecord.originalFileName || resumeRecord.fileName,
          message: parsedResume?.errorMessage || 'Resume parsing failed',
        })
        continue
      }
      candidates.push(candidateFromParsedResume(parsedResume, parsedResume.parsedData))
    } catch (error) {
      failures.push({
        fileName: file.name || 'Resume',
        message: error.message || 'Resume upload failed',
      })
    }
  }

  if (!candidates.length) {
    return fail('No resumes could be parsed. Please check the files and try again.', 400, 'RESUME_PARSE_FAILED', { failures })
  }

  return ok({ candidates, failures }, failures.length ? 'Some resumes need review' : 'Resumes parsed', 201)
})
