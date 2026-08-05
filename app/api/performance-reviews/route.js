export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import PerformanceReview from '@/models/PerformanceReview'
import Employee from '@/models/Employee'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 50)
  const employeeId = searchParams.get('employeeId')

  const query = { tenantId }
  if (session.role === 'EMPLOYEE') {
    query.employee = session.userId
    query.status = 'SUBMITTED' // drafts stay private to the reviewer until submitted
  } else if (session.role === 'MANAGER') {
    query.reviewer = session.userId
    if (employeeId) query.employee = employeeId
  } else {
    await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
    if (employeeId) query.employee = employeeId
  }

  const totalElements = await PerformanceReview.countDocuments(query)
  const content = await PerformanceReview.find(query)
    .populate('employee', 'firstName lastName employeeCode')
    .populate('reviewer', 'firstName lastName')
    .sort({ createdAt: -1 })
    .skip(page * size)
    .limit(size)

  return ok(paged(content, page, size, totalElements))
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  await requireRole(session, ['MANAGER', 'HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!body.employeeId || !body.periodLabel) return fail('employeeId and periodLabel are required', 400)

  if (session.role === 'MANAGER') {
    const employee = await Employee.findOne({ _id: body.employeeId, tenantId })
    if (!employee || String(employee.reportingManager) !== session.userId) {
      return fail('You can only review your own direct reports', 403)
    }
  }

  const review = await PerformanceReview.create({
    employee: body.employeeId,
    reviewer: session.userId,
    periodLabel: body.periodLabel,
    kraScore: body.kraScore ?? null,
    tenantId,
    createdBy: session.sub,
  })

  await logAction(session, {
    action: 'PERFORMANCE_REVIEW_CREATED',
    entityType: 'PerformanceReview',
    entityId: review._id,
    description: `Performance review draft created for ${body.periodLabel}`,
  })

  return ok(review, 'Review draft created', 201)
})
