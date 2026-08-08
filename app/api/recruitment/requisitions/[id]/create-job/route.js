export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { REQUISITION_ACCESS_ROLES, REQUISITION_STATUS, REQUISITION_ACTIVITY_TYPE } from '@/lib/recruitmentConstants'
import { JOB_STATUS, canManageJobs, computeRemainingOpenings } from '@/lib/jobConstants'
import { validateAlways } from '@/lib/jobValidation'
import { populateRequisition, getActorName, getRequisitionSkills } from '@/lib/requisitionHelpers'
import {
  populateJob, generateJobCode, syncJobSkills, syncScreeningQuestions,
  syncApplicationFields, syncPipelineStages, getJobRelatedData,
} from '@/lib/jobHelpers'
import JobRequisition from '@/models/JobRequisition'
import Job from '@/models/Job'

// The one place a Job gets created from a Requisition. Doubles as the
// enforcement point for Rules 1-3: only an APPROVED requisition converts,
// at most once, and the requisition flips to JOB_CREATED as part of the
// same request.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, REQUISITION_ACCESS_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  if (!canManageJobs(session)) {
    return fail('You do not have permission to create a job opening', 403, 'FORBIDDEN')
  }

  const requisition = await populateRequisition(JobRequisition.findOne({ _id: params.id, tenantId, deleted: false }))
  if (!requisition) throw new ApiError(404, 'Requisition not found', 'NOT_FOUND')

  // Rule 1
  if (requisition.status !== REQUISITION_STATUS.APPROVED) {
    return fail('Only approved requisitions can be converted into a job opening', 400, 'INVALID_STATUS')
  }
  // Rule 2 (belt-and-braces alongside the status check above, which alone
  // already prevents a second call since status flips away from APPROVED)
  if (requisition.linkedJobId || await Job.exists({ tenantId, requisitionId: requisition._id })) {
    return fail('A job opening has already been created from this requisition', 400, 'JOB_ALREADY_EXISTS')
  }

  const reqSkills = await getRequisitionSkills(tenantId, requisition._id)

  // HR reviews/edits only allowed fields on the form before submitting —
  // whatever they send in `body` wins; anything omitted falls back to what
  // the requisition already specified, so nothing has to be retyped.
  const pick = (bodyValue, fallback) => (bodyValue !== undefined && bodyValue !== '' ? bodyValue : fallback)
  const jobFields = {
    jobTitle: pick(body.jobTitle, requisition.jobTitle),
    department: pick(body.department, requisition.department?._id),
    designation: pick(body.designation, requisition.designation?._id),
    totalOpenings: pick(body.totalOpenings, requisition.openings),
    employmentType: pick(body.employmentType, requisition.employmentType),
    workMode: pick(body.workMode, requisition.workMode),
    location: pick(body.location, requisition.location?._id),
    hiringManager: pick(body.hiringManager, requisition.hiringManager?._id),
    recruiter: pick(body.recruiter, requisition.recruiter?._id),
    minExperience: pick(body.minExperience, requisition.minExperience),
    maxExperience: pick(body.maxExperience, requisition.maxExperience),
    minEducation: pick(body.minEducation, requisition.education),
    certifications: pick(body.certifications, requisition.certifications),
    industryExperience: pick(body.industryExperience, requisition.industryExperience),
    internalMinCtc: pick(body.internalMinCtc, requisition.minCtc),
    internalMaxCtc: pick(body.internalMaxCtc, requisition.maxCtc),
    currency: pick(body.currency, requisition.currency),
    jobSummary: pick(body.jobSummary, requisition.jobSummary),
    responsibilities: pick(body.responsibilities, requisition.responsibilities),
    requiredQualifications: pick(body.requiredQualifications, requisition.requiredQualifications),
    preferredQualifications: pick(body.preferredQualifications, requisition.preferredQualifications),
    benefits: pick(body.benefits, requisition.benefits),
    expectedJoiningDate: pick(body.expectedJoiningDate, requisition.expectedJoiningDate),
    publicSalaryVisible: body.publicSalaryVisible ?? false,
    publicMinCtc: body.publicMinCtc,
    publicMaxCtc: body.publicMaxCtc,
    preferredEducation: body.preferredEducation,
    freshersAllowed: body.freshersAllowed ?? false,
    aboutRole: body.aboutRole,
    perks: body.perks,
    publicTitle: body.publicTitle || null,
    publicDescription: body.publicDescription || null,
    pipelineTemplate: body.pipelineTemplate || 'DEFAULT_HIRING',
    openingDate: body.openingDate,
    applicationDeadline: body.applicationDeadline,
    targetClosingDate: body.targetClosingDate,
    visibility: body.visibility || 'INTERNAL_ONLY',
  }

  const fieldErrors = validateAlways(jobFields)
  if (Object.keys(fieldErrors).length) {
    return fail('Please fix the highlighted fields', 400, 'VALIDATION_ERROR', { errors: fieldErrors })
  }

  const jobCode = await generateJobCode(Job, tenantId)
  const actorName = await getActorName(session)

  const job = new Job({
    ...jobFields,
    jobCode,
    requisitionId: requisition._id,
    status: JOB_STATUS.DRAFT,
    createdByEmployee: session.userId,
    tenantId,
    createdBy: session.sub,
  })
  job.activityLog.push({
    type: 'CREATED',
    message: `Job created from ${requisition.requisitionCode}`,
    actorId: session.userId,
    actorName,
  })
  await job.save()

  await Promise.all([
    syncJobSkills(
      tenantId, job._id,
      body.requiredSkills ?? reqSkills.requiredSkills,
      body.preferredSkills ?? reqSkills.preferredSkills
    ),
    syncScreeningQuestions(tenantId, job._id, body.screeningQuestions),
    syncApplicationFields(tenantId, job._id, body.applicationFields),
    syncPipelineStages(tenantId, job._id, body.pipelineStages, job.pipelineTemplate),
  ])

  // Rule 3
  requisition.status = REQUISITION_STATUS.JOB_CREATED
  requisition.linkedJobId = job._id
  requisition.updatedBy = session.sub
  requisition.activityLog.push({
    type: REQUISITION_ACTIVITY_TYPE.JOB_CREATED,
    message: `Job opening ${jobCode} created`,
    actorId: session.userId,
    actorName,
  })
  await requisition.save()

  await Promise.all([
    logAction(session, { action: 'JOB_CREATED', entityType: 'Job', entityId: job._id, description: `Job ${jobCode} created from requisition ${requisition.requisitionCode}`, req }),
    logAction(session, { action: 'REQUISITION_JOB_CREATED', entityType: 'JobRequisition', entityId: requisition._id, description: `Requisition ${requisition.requisitionCode} converted into job ${jobCode}`, req }),
  ])

  const populated = await populateJob(Job.findById(job._id))
  const related = await getJobRelatedData(tenantId, job._id)
  return ok(
    { ...populated.toObject(), ...related, remainingOpenings: computeRemainingOpenings(populated) },
    'Job opening created from requisition',
    201
  )
})
