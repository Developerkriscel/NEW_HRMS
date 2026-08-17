export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { runForTenant } from '@/lib/tenantDb'
import { resolveTenantBySlug } from '@/lib/publicJobHelpers'
import { validateApplicationForm, isValid, CONFIGURABLE_FIELD_TO_FORM_KEY } from '@/lib/candidateValidation'
import { validateResumeFile } from '@/lib/resumeStorage'
import { createResumeRecord, triggerBackgroundParse } from '@/lib/candidateProfileHelpers'
import { normalizeSource, APPLICATION_SOURCE } from '@/lib/candidateConstants'
import { generateCandidateCode, generateApplicationCode, findExistingCandidate } from '@/lib/candidateHelpers'
import Job from '@/models/Job'
import JobScreeningQuestion from '@/models/JobScreeningQuestion'
import JobApplicationField from '@/models/JobApplicationField'
import JobPipelineStage from '@/models/JobPipelineStage'
import Candidate from '@/models/Candidate'
import Application from '@/models/Application'
import ApplicationAnswer from '@/models/ApplicationAnswer'
import Employee from '@/models/Employee'

function readField(formData, key) {
  const value = formData.get(key)
  return value === null || value === '' ? undefined : value
}
function readNumber(formData, key) {
  const value = readField(formData, key)
  return value === undefined ? undefined : Number(value)
}

// POST /api/public/careers/:companySlug/jobs/:id/apply — public,
// unauthenticated, multipart/form-data (resume file + form fields).
// Implements the exact sequence from the spec: validate job -> validate
// visibility -> check deadline -> check existing candidate -> create/reuse
// candidate -> create application -> save answers -> save resume -> log
// activity -> (notify HR) -> return success payload.
export const POST = withApi(async (req, { params }) => {
  const tenant = await resolveTenantBySlug(params.companySlug)
  if (!tenant) return fail('Company not found', 404, 'NOT_FOUND')

  return runForTenant(tenant, async () => {
    const job = await Job.findOne({ _id: params.slugOrId, tenantId: tenant._id, deleted: false })
    if (!job) return fail('Job not found', 404, 'NOT_FOUND')
    if (job.status !== 'OPEN') return fail('This position is no longer accepting applications', 400, 'JOB_NOT_OPEN')
    if (job.visibility !== 'PUBLIC') return fail('This position is not open for public applications', 400, 'JOB_NOT_PUBLIC')
    if (job.applicationDeadline && new Date(job.applicationDeadline) < new Date()) {
      return fail('The application deadline for this position has passed', 400, 'DEADLINE_PASSED')
    }

    let formData
    try {
      formData = await req.formData()
    } catch {
      return fail('Invalid form submission', 400, 'VALIDATION_ERROR')
    }

    const [applicationFields, screeningQuestions] = await Promise.all([
      JobApplicationField.find({ tenantId: tenant._id, jobId: job._id }).lean(),
      JobScreeningQuestion.find({ tenantId: tenant._id, jobId: job._id }).sort({ order: 1 }).lean(),
    ])

    let screeningAnswersRaw = {}
    try {
      screeningAnswersRaw = JSON.parse(formData.get('screeningAnswers') || '{}')
    } catch {
      return fail('Invalid screening answers', 400, 'VALIDATION_ERROR')
    }

    const data = {
      firstName: readField(formData, 'firstName'),
      lastName: readField(formData, 'lastName'),
      email: readField(formData, 'email')?.toLowerCase(),
      phone: readField(formData, 'phone'),
      currentLocation: readField(formData, 'currentLocation'),
      currentCompany: readField(formData, 'currentCompany'),
      currentDesignation: readField(formData, 'currentDesignation'),
      totalExperience: readNumber(formData, 'totalExperience'),
      relevantExperience: readNumber(formData, 'relevantExperience'),
      currentCtc: readNumber(formData, 'currentCtc'),
      expectedCtc: readNumber(formData, 'expectedCtc'),
      noticePeriod: readField(formData, 'noticePeriod'),
      lastWorkingDate: readField(formData, 'lastWorkingDate'),
      linkedinUrl: readField(formData, 'linkedinUrl'),
      githubUrl: readField(formData, 'githubUrl'),
      portfolioUrl: readField(formData, 'portfolioUrl'),
      coverLetter: readField(formData, 'coverLetter'),
      consentAccurate: formData.get('consentAccurate') === 'true',
      consentProcessing: formData.get('consentProcessing') === 'true',
      screeningAnswers: screeningAnswersRaw,
    }

    const fieldErrors = validateApplicationForm(data, { applicationFields, screeningQuestions })
    const resumeFile = formData.get('resume')
    const resumeError = validateResumeFile(resumeFile)
    if (resumeError) fieldErrors.resume = resumeError
    if (Object.keys(fieldErrors).length) {
      return fail('Please fix the highlighted fields', 400, 'VALIDATION_ERROR', { errors: fieldErrors })
    }

    // Duplicate detection — reuse the existing person rather than creating
    // a second Candidate for the same email/phone.
    let candidate = await findExistingCandidate(Candidate, tenant._id, { email: data.email, phone: data.phone })

    const { searchParams } = new URL(req.url)
    const source = normalizeSource(searchParams.get('source'))
    let referrerEmployeeId = null
    if (source === APPLICATION_SOURCE.REFERRAL && searchParams.get('ref')) {
      const referrer = await Employee.findOne({ tenantId: tenant._id, employeeCode: searchParams.get('ref'), deleted: false }).select('_id')
      referrerEmployeeId = referrer?._id || null
    }

    if (candidate) {
      // Rule: no duplicate application for the same candidate + same job.
      const duplicate = await Application.findOne({ tenantId: tenant._id, candidateId: candidate._id, jobId: job._id })
      if (duplicate) {
        return fail('You have already applied for this position with this email/phone', 400, 'DUPLICATE_APPLICATION')
      }
    }

    const newCandidateCode = candidate ? null : await generateCandidateCode(Candidate, tenant._id)

    if (candidate) {
      // A returning candidate's most recent submission is treated as their
      // freshest profile info — updates the master record rather than
      // silently keeping stale data from their first-ever application.
      Object.assign(candidate, {
        firstName: data.firstName ?? candidate.firstName, lastName: data.lastName ?? candidate.lastName,
        phone: data.phone, currentLocation: data.currentLocation ?? candidate.currentLocation,
        currentCompany: data.currentCompany ?? candidate.currentCompany,
        currentDesignation: data.currentDesignation ?? candidate.currentDesignation,
        totalExperience: data.totalExperience ?? candidate.totalExperience,
        relevantExperience: data.relevantExperience ?? candidate.relevantExperience,
        currentCtc: data.currentCtc ?? candidate.currentCtc,
        expectedCtc: data.expectedCtc ?? candidate.expectedCtc,
        noticePeriod: data.noticePeriod ?? candidate.noticePeriod,
        lastWorkingDate: data.lastWorkingDate ?? candidate.lastWorkingDate,
        linkedinUrl: data.linkedinUrl ?? candidate.linkedinUrl,
        githubUrl: data.githubUrl ?? candidate.githubUrl,
        portfolioUrl: data.portfolioUrl ?? candidate.portfolioUrl,
      })
      candidate.activityLog.push({ type: 'APPLICATION_ADDED', message: `Applied for ${job.jobTitle}`, actorName: candidate.getFullName() })
      await candidate.save()
    } else {
      candidate = await Candidate.create({
        candidateCode: newCandidateCode,
        firstName: data.firstName, lastName: data.lastName || '',
        email: data.email, phone: data.phone,
        currentLocation: data.currentLocation, currentCompany: data.currentCompany, currentDesignation: data.currentDesignation,
        totalExperience: data.totalExperience, relevantExperience: data.relevantExperience,
        currentCtc: data.currentCtc, expectedCtc: data.expectedCtc,
        noticePeriod: data.noticePeriod, lastWorkingDate: data.lastWorkingDate || null,
        linkedinUrl: data.linkedinUrl, githubUrl: data.githubUrl, portfolioUrl: data.portfolioUrl,
        source,
        tenantId: tenant._id,
        activityLog: [{ type: 'CREATED', message: `Candidate created from application for ${job.jobTitle}` }],
      })
    }

    const firstStage = await JobPipelineStage.findOne({ tenantId: tenant._id, jobId: job._id, isActive: true }).sort({ order: 1 })

    const applicationCode = await generateApplicationCode(Application, tenant._id)
    const application = await Application.create({
      applicationCode,
      candidateId: candidate._id,
      jobId: job._id,
      source,
      sourceTrackingCode: searchParams.get('source') || null,
      referrerEmployeeId,
      currentStage: firstStage?._id || null,
      currentStageName: firstStage?.name || 'Applied',
      tenantId: tenant._id,
      activityLog: [{ type: 'CREATED', message: `Application submitted via ${source}` }],
    })

    // Step 6 — save the resume as a versioned candidate_resumes row (never
    // overwriting an earlier upload) and kick off parsing in the
    // background. The candidate never waits on this: the HTTP response
    // below is returned before parsing finishes.
    const resumeRecord = await createResumeRecord({
      tenantId: tenant._id,
      candidateId: candidate._id,
      candidateCode: candidate.candidateCode,
      applicationId: application._id,
      file: resumeFile,
      uploadSource: 'APPLICATION',
    })
    candidate.resumeUrl = resumeRecord.fileUrl
    candidate.activityLog.push({ type: 'RESUME_UPLOADED', message: `Resume uploaded: ${resumeRecord.originalFileName || resumeRecord.fileName}` })
    await candidate.save()
    triggerBackgroundParse(resumeRecord._id, tenant._id)

    if (screeningQuestions.length) {
      await ApplicationAnswer.insertMany(screeningQuestions.map((q) => ({
        tenantId: tenant._id,
        applicationId: application._id,
        questionId: q._id,
        questionText: q.question,
        questionType: q.type,
        isKnockout: q.isKnockout,
        rule: q.rule,
        answer: data.screeningAnswers[String(q._id)] ?? null,
      })))
    }

    // "Notify HR" — there's no email/push infra in this codebase (see the
    // same limitation noted in company/settings), so this lands where HR
    // will actually see it: the job's own activity timeline.
    job.activityLog.push({ type: 'UPDATED', message: `New application received from ${candidate.getFullName()} (${source})` })
    await job.save()

    return ok({
      applicationCode: application.applicationCode,
      candidateCode: candidate.candidateCode,
      jobTitle: job.publicTitle || job.jobTitle,
    }, 'Application submitted successfully', 201)
  })
})
