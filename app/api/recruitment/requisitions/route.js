export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import { REQUISITION_ACCESS_ROLES, REQUISITION_ACTIVITY_TYPE, REQUISITION_STATUS } from '@/lib/recruitmentConstants'
import { validateAlways } from '@/lib/recruitmentValidation'
import {
  populateRequisition, generateRequisitionCode, getActorName,
  syncRequisitionSkills, getRequisitionSkills, assertReplacementEmployeeValid,
  applyWritableFields,
} from '@/lib/requisitionHelpers'
import JobRequisition from '@/models/JobRequisition'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, REQUISITION_ACCESS_ROLES)
  const tenantId = requireTenantId(session)

  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 20)
  const status = searchParams.get('status')
  const department = searchParams.get('department')
  const requestedBy = searchParams.get('requestedBy')
  const priority = searchParams.get('priority')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const search = searchParams.get('search')

  const query = { tenantId, deleted: false }
  // Manager -> "view own requisitions" only, per RBAC. Ignore any
  // requestedBy override attempt from the client for that role.
  if (session.role === 'MANAGER') {
    query.requestedBy = session.userId
  } else if (requestedBy) {
    query.requestedBy = requestedBy
  }
  if (status) query.status = status
  if (department) query.department = department
  if (priority) query.priority = priority
  if (dateFrom || dateTo) {
    query.createdAt = {}
    if (dateFrom) query.createdAt.$gte = new Date(dateFrom)
    if (dateTo) query.createdAt.$lte = new Date(new Date(dateTo).setHours(23, 59, 59, 999))
  }
  if (search) {
    query.$or = [
      { jobTitle: { $regex: search, $options: 'i' } },
      { requisitionCode: { $regex: search, $options: 'i' } },
    ]
  }

  const totalElements = await JobRequisition.countDocuments(query)
  const content = await populateRequisition(
    JobRequisition.find(query).sort({ createdAt: -1 }).skip(page * size).limit(size)
  )

  return ok(paged(content, page, size, totalElements))
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, REQUISITION_ACCESS_ROLES)
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!body.jobTitle) return fail('Job title is required', 400)

  const fieldErrors = validateAlways(body)
  if (Object.keys(fieldErrors).length) return fail('Please fix the highlighted fields', 400, 'VALIDATION_ERROR', { errors: fieldErrors })

  if (body.replacementEmployee) await assertReplacementEmployeeValid(tenantId, body.replacementEmployee)

  const requisitionCode = await generateRequisitionCode(JobRequisition, tenantId)
  const actorName = await getActorName(session)

  const requisition = new JobRequisition({
    requisitionCode,
    status: REQUISITION_STATUS.DRAFT,
    requestedBy: session.userId,
    tenantId,
    createdBy: session.sub,
  })
  applyWritableFields(requisition, body)
  requisition.activityLog.push({
    type: REQUISITION_ACTIVITY_TYPE.CREATED,
    message: 'Requisition created',
    actorId: session.userId,
    actorName,
  })
  await requisition.save()

  await syncRequisitionSkills(tenantId, requisition._id, body.requiredSkills, body.preferredSkills)

  await logAction(session, {
    action: 'REQUISITION_CREATED',
    entityType: 'JobRequisition',
    entityId: requisition._id,
    description: `Requisition ${requisitionCode} (${requisition.jobTitle}) created`,
    req,
  })

  const populated = await populateRequisition(JobRequisition.findById(requisition._id))
  const skills = await getRequisitionSkills(tenantId, requisition._id)
  return ok({ ...populated.toObject(), ...skills }, 'Requisition saved as draft', 201)
})
