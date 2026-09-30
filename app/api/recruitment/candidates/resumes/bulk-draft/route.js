export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { CANDIDATE_MANAGE_ROLES } from '@/lib/candidateConstants'
import { createResumeRecord, runParseAndPersist } from '@/lib/candidateProfileHelpers'

const MAX_BULK_RESUMES = 20

function candidateFromParsedResume(resume, parsed) {
  const personal = parsed?.personal || {}
  return {
    id: String(resume._id),
    name: personal.name || 'Unknown',
    email: personal.email || '',
    phone: personal.phone || '',
    exp: personal.totalExperience ? `${personal.totalExperience} Years` : null,
    totalExperience: personal.totalExperience ?? null,
    role: personal.currentDesignation || '',
    location: personal.currentLocation || '',
    currentLocation: personal.currentLocation || '',
    currentCompany: personal.currentCompany || '',
    currentDesignation: personal.currentDesignation || '',
    score: null,
    skills: (parsed?.skills || []).map((skill) => skill.skillName).filter(Boolean).slice(0, 20),
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
