export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId, ApiError } from '@/lib/auth'
import { PREBOARDING_SENSITIVE_VIEW_ROLES } from '@/lib/preboardingConstants'
import { syncReadinessStatus } from '@/lib/candidateEmployeeConversionService'
import Preboarding from '@/models/Preboarding'
import OfferVersion from '@/models/OfferVersion'

function isObjectId(value) {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value)
}

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_SENSITIVE_VIEW_ROLES)
  const tenantId = requireTenantId(session)

  const preview = await syncReadinessStatus(tenantId, params.id)
  if (!preview) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')

  return ok(preview)
})

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  await requireRole(session, PREBOARDING_SENSITIVE_VIEW_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json()

  const preboarding = await Preboarding.findOne({ _id: params.id, tenantId, deleted: false })
  if (!preboarding) throw new ApiError(404, 'Preboarding profile not found', 'NOT_FOUND')

  const patch = {}
  if (isObjectId(body.department)) patch.departmentId = body.department
  if (isObjectId(body.branch)) patch.locationId = body.branch
  if (isObjectId(body.shift)) patch.shiftId = body.shift
  if (isObjectId(body.reportingManager)) patch.managerId = body.reportingManager
  if (body.employmentType !== undefined) patch.employmentType = body.employmentType
  if (body.workMode !== undefined) patch.workMode = body.workMode
  if (body.probationPeriod !== undefined) patch.probationPeriod = body.probationPeriod
  if (body.joiningDate) patch.joiningDate = new Date(body.joiningDate)

  const version = await OfferVersion.findOneAndUpdate(
    { _id: preboarding.offerVersionId, tenantId, deleted: false },
    { $set: patch },
    { new: true }
  )
  if (!version) return fail('Offer version not found', 404)

  if (body.joiningDate) {
    preboarding.confirmedJoiningDate = new Date(body.joiningDate)
    preboarding.activityLog.push({
      type: 'JOINING_CONFIG_UPDATED',
      message: 'Joining configuration updated',
      actorName: session.name || session.sub,
    })
    await preboarding.save()
  }

  const preview = await syncReadinessStatus(tenantId, params.id)
  return ok(preview, 'Joining configuration saved')
})
