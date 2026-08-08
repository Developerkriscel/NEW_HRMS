export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { JOB_VIEW_ROLES, JOB_STATUS, canManageJobs, computeRemainingOpenings } from '@/lib/jobConstants'
import {
  generateJobCode, getActorName, getJobRelatedData, syncJobSkills, syncScreeningQuestions,
  syncApplicationFields, syncPipelineStages, populateJob, JOB_WRITABLE_FIELDS,
} from '@/lib/jobHelpers'
import Job from '@/models/Job'

// Clones a job as a fresh Draft — deliberately NOT linked to the same
// requisition (that requisition is already JOB_CREATED and points at the
// original; double-linking it here would break Rule 2's "one requisition ->
// one job"). Openings/fill progress reset; workflow/activity history don't
// carry over since this is a new posting, not a continuation.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, JOB_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  if (!canManageJobs(session)) return fail('You do not have permission to duplicate job openings', 403, 'FORBIDDEN')

  const source = await Job.findOne({ _id: params.id, tenantId, deleted: false })
  if (!source) throw new ApiError(404, 'Job opening not found', 'NOT_FOUND')

  const jobCode = await generateJobCode(Job, tenantId)
  const actorName = await getActorName(session)

  const clone = new Job({ tenantId, createdBy: session.sub, createdByEmployee: session.userId, jobCode, status: JOB_STATUS.DRAFT, requisitionId: null })
  for (const field of JOB_WRITABLE_FIELDS) clone[field] = source[field]
  clone.jobTitle = `${source.jobTitle} (Copy)`
  clone.filledOpenings = 0
  clone.activityLog.push({ type: 'CREATED', message: `Duplicated from ${source.jobCode}`, actorId: session.userId, actorName })
  await clone.save()

  const related = await getJobRelatedData(tenantId, source._id)
  await Promise.all([
    syncJobSkills(tenantId, clone._id, related.requiredSkills, related.preferredSkills),
    syncScreeningQuestions(tenantId, clone._id, related.screeningQuestions),
    syncApplicationFields(tenantId, clone._id, related.applicationFields),
    syncPipelineStages(tenantId, clone._id, related.pipelineStages),
  ])

  await logAction(session, { action: 'JOB_DUPLICATED', entityType: 'Job', entityId: clone._id, description: `Job ${jobCode} duplicated from ${source.jobCode}`, req })

  const populated = await populateJob(Job.findById(clone._id))
  const clonedRelated = await getJobRelatedData(tenantId, clone._id)
  return ok({ ...populated.toObject(), ...clonedRelated, remainingOpenings: computeRemainingOpenings(populated) }, 'Job opening duplicated', 201)
})
