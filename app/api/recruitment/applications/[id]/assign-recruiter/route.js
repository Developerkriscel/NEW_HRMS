export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { CANDIDATE_MANAGE_ROLES, ACTIVITY_ENTRY_TYPE } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Application from '@/models/Application'
import Employee from '@/models/Employee'

// POST { recruiterId } — recruiterId: null unassigns. Same route handles
// both "Assign Recruiter" and "Reassign Recruiter" (item 14) since it's the
// same operation either way.
export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json().catch(() => ({}))

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')

  let recruiter = null
  if (body.recruiterId) {
    recruiter = await Employee.findOne({ _id: body.recruiterId, tenantId, deleted: false }).select('firstName lastName')
    if (!recruiter) throw new ApiError(404, 'Recruiter not found', 'NOT_FOUND')
  }

  const actorName = await getActorName(session)
  const previouslyAssigned = !!application.assignedRecruiterId
  application.assignedRecruiterId = recruiter?._id || null
  application.activityLog.push({
    type: ACTIVITY_ENTRY_TYPE.UPDATED,
    message: recruiter
      ? `${previouslyAssigned ? 'Reassigned' : 'Assigned'} to ${recruiter.firstName} ${recruiter.lastName} by ${actorName}`
      : `Unassigned from recruiter by ${actorName}`,
    actorName,
  })
  await application.save()

  await logAction(session, { action: 'APPLICATION_RECRUITER_ASSIGNED', entityType: 'Application', entityId: application._id, description: `Recruiter ${recruiter ? recruiter._id : 'unassigned'}`, req })

  return ok(application, 'Recruiter updated')
})
