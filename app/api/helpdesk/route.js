export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail, paged } from '@/lib/apiResponse'
import { requireAuth, requireRole, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import HelpdeskTicket from '@/models/HelpdeskTicket'
import Employee from '@/models/Employee'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const { searchParams } = new URL(req.url)
  const page = Number(searchParams.get('page') || 0)
  const size = Number(searchParams.get('size') || 50)
  const status = searchParams.get('status')

  const query = { tenantId }
  if (session.role === 'EMPLOYEE') {
    query.raisedBy = session.userId
  } else if (session.role === 'MANAGER') {
    const reports = await Employee.find({ reportingManager: session.userId, tenantId, deleted: false }).select('_id')
    const reportIds = reports.map((r) => r._id)
    // Team tickets the employee has opted to share, plus anything the manager raised themselves.
    query.$or = [
      { raisedBy: { $in: reportIds }, visibleToManager: true },
      { raisedBy: session.userId },
    ]
  } else {
    await requireRole(session, ['HR_MANAGER', 'COMPANY_ADMIN', 'IT_ADMIN', 'SUPPORT_AGENT', 'SUPER_ADMIN'])
  }
  if (status) query.status = status

  const totalElements = await HelpdeskTicket.countDocuments(query)
  const content = await HelpdeskTicket.find(query)
    .populate('raisedBy', 'firstName lastName employeeCode')
    .populate('comments.by', 'firstName lastName role')
    .sort({ createdAt: -1 })
    .skip(page * size)
    .limit(size)

  return ok(paged(content, page, size, totalElements))
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()
  if (!body.subject) return fail('subject is required', 400)

  const ticket = await HelpdeskTicket.create({
    raisedBy: session.userId,
    category: body.category,
    subject: body.subject,
    description: body.description,
    priority: body.priority || 'MEDIUM',
    visibleToManager: body.visibleToManager !== false,
    tenantId,
    createdBy: session.sub,
  })

  await logAction(session, {
    action: 'HELPDESK_TICKET_RAISED',
    entityType: 'HelpdeskTicket',
    entityId: ticket._id,
    description: `Ticket "${ticket.subject}" raised`,
  })

  return ok(ticket, 'Ticket raised', 201)
})
