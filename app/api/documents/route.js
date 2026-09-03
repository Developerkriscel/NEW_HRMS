export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import EmployeeDocument from '@/models/EmployeeDocument'
import Employee from '@/models/Employee'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const query = { tenantId, deleted: false }
  if (session.role === 'EMPLOYEE' || session.role === 'MANAGER') query.employee = session.userId
  else await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
  if (status) query.status = status

  const documents = await EmployeeDocument.find(query)
    .populate('employee', 'firstName lastName employeeCode')
    .populate('uploadedBy', 'firstName lastName')
    .sort({ createdAt: -1 })

  return ok(documents)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()

  if (!body.title) return fail('title is required', 400)

  let employeeId = session.userId
  if (session.role !== 'EMPLOYEE' && session.role !== 'MANAGER') {
    await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN'])
    if (!body.employeeId) return fail('employeeId is required', 400)
    const employee = await Employee.findOne({ _id: body.employeeId, tenantId, deleted: false })
    if (!employee) return fail('Employee not found', 404)
    employeeId = body.employeeId
  }

  const document = await EmployeeDocument.create({
    employee: employeeId,
    title: body.title,
    category: body.category || 'GENERAL',
    fileUrl: body.fileUrl,
    status: body.status || 'SUBMITTED',
    expiresAt: body.expiresAt || null,
    uploadedBy: session.userId,
    notes: body.notes,
    tenantId,
    createdBy: session.sub,
  })

  await logAction(session, {
    action: 'DOCUMENT_CREATED',
    entityType: 'EmployeeDocument',
    entityId: document._id,
    description: `Document "${document.title}" added`,
  })

  return ok(document, 'Document added', 201)
})
