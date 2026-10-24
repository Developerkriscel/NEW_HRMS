export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { ACTIVITY_ENTRY_TYPE, APPLICATION_STATUS, CANDIDATE_MANAGE_ROLES } from '@/lib/candidateConstants'
import { getActorName } from '@/lib/candidateHelpers'
import Application from '@/models/Application'

// Removing a rejected application must not remove the candidate profile. A
// candidate can have multiple applications, and the profile may be needed for
// a future opening, so this endpoint deliberately performs a tenant-scoped
// soft delete and keeps the audit trail intact.
export const DELETE = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, CANDIDATE_MANAGE_ROLES)
  const tenantId = requireTenantId(session)

  const application = await Application.findOne({ _id: params.id, tenantId, deleted: false })
  if (!application) throw new ApiError(404, 'Application not found', 'NOT_FOUND')
  if (application.status !== APPLICATION_STATUS.REJECTED) {
    return fail('Only rejected applications can be deleted from the pipeline', 400, 'INVALID_STATE')
  }

  const actorName = await getActorName(session)
  application.activityLog.push({
    type: ACTIVITY_ENTRY_TYPE.STATUS_CHANGED,
    message: `Rejected application removed by ${actorName}`,
    comment: 'Application was soft-deleted from the rejected pipeline.',
    actorName,
  })
  application.deleted = true
  application.updatedBy = session.sub
  await application.save()

  await logAction(session, {
    action: 'APPLICATION_DELETED',
    entityType: 'Application',
    entityId: application._id,
    description: `${application.applicationCode} removed from rejected applications`,
    req,
  })

  return ok({ applicationId: application._id }, 'Rejected application deleted')
})
