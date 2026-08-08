export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import {
  JOB_VIEW_ROLES, JOB_STATUS, canCreateWithoutRequisition, computeRemainingOpenings,
} from '@/lib/jobConstants'
import { validateAlways } from '@/lib/jobValidation'
import {
  populateJob, generateJobCode, getActorName, syncJobSkills, syncScreeningQuestions,
  syncApplicationFields, syncPipelineStages, getJobRelatedData, applyWritableJobFields,
} from '@/lib/jobHelpers'
import Job from '@/models/Job'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 20)
  const status = searchParams.get('status')
  const department = searchParams.get('department')
  const location = searchParams.get('location')
  const recruiter = searchParams.get('recruiter')
  const hiringManager = searchParams.get('hiringManager')
  const employmentType = searchParams.get('employmentType')
  const workMode = searchParams.get('workMode')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const search = searchParams.get('search')

  const query = { tenantId, deleted: false }
  if (status) query.status = status
  if (department) query.department = department
  if (location) query.location = location
  if (recruiter) query.recruiter = recruiter
  if (hiringManager) query.hiringManager = hiringManager
  if (employmentType) query.employmentType = employmentType
  if (workMode) query.workMode = workMode
  if (dateFrom || dateTo) {
    query.createdAt = {}
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom)
    if (dateTo) query.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999))
  }
  if (search) {
    query.$or = [
      { jobTitle: { $regex: search, $options: 'i' } },
      { jobCode: { $regex: search, $options: 'i' } },
    ]
  }

  const totalElements = await Job.countDocuments(query)
  const content = await populateJob(
    Job.find(query).sort({ createdAt: -1 }).skip(page * size).limit(size)
  )
  const withRemaining = content.map((j) => {
    const obj = j.toObject()
    obj.remainingOpenings = computeRemainingOpenings(obj)
    return obj
  })

  return ok(paged(withRemaining, page, size, totalElements))
})

// Direct creation — no requisition behind it. Creating from an approved
// requisition goes through POST /api/recruitment/requisitions/:id/create-job
// instead, which also flips the requisition to JOB_CREATED (Rule 3).
export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!canCreateWithoutRequisition(session)) {
    return fail('You do not have permission to create a job opening without an approved requisition', 403, 'FORBIDDEN')
  }
  if (!body.jobTitle) return fail('Job title is required', 400)

  const fieldErrors = validateAlways(body)
  if (Object.keys(fieldErrors).length) return fail('Please fix the highlighted fields', 400, 'VALIDATION_ERROR', { errors: fieldErrors })

  const jobCode = await generateJobCode(Job, tenantId)
  const actorName = await getActorName(session)

  const job = new Job({
    jobCode,
    status: JOB_STATUS.DRAFT,
    createdByEmployee: session.userId,
    tenantId,
    createdBy: session.sub,
  })
  applyWritableJobFields(job, body)
  job.activityLog.push({ type: 'CREATED', message: 'Job created directly (no linked requisition)', actorId: session.userId, actorName })
  await job.save()

  await Promise.all([
    syncJobSkills(tenantId, job._id, body.requiredSkills, body.preferredSkills),
    syncScreeningQuestions(tenantId, job._id, body.screeningQuestions),
    syncApplicationFields(tenantId, job._id, body.applicationFields),
    syncPipelineStages(tenantId, job._id, body.pipelineStages, body.pipelineTemplate),
  ])

  await logAction(session, {
    action: 'JOB_CREATED',
    entityType: 'Job',
    entityId: job._id,
    description: `Job ${jobCode} (${job.jobTitle}) created directly`,
    req,
  })

  const populated = await populateJob(Job.findById(job._id))
  const related = await getJobRelatedData(tenantId, job._id)
  return ok({ ...populated.toObject(), ...related, remainingOpenings: computeRemainingOpenings(populated) }, 'Job opening created', 201)
})
