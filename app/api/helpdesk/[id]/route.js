export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import HelpdeskTicket from '@/models/HelpdeskTicket'
import Employee from '@/models/Employee'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)

  const ticket = await HelpdeskTicket.findOne({ _id: params.id, tenantId })
    .populate('raisedBy', 'firstName lastName employeeCode reportingManager')
    .populate('comments.by', 'firstName lastName')
  if (!ticket) return fail('Ticket not found', 404)

  const isOwner = String(ticket.raisedBy._id) === session.userId
  const isAdmin = ['HR_MANAGER', 'COMPANY_ADMIN', 'IT_ADMIN', 'SUPPORT_AGENT', 'SUPER_ADMIN'].includes(session.role)
  const isManagerWithAccess =
    session.role === 'MANAGER' &&
    ticket.visibleToManager &&
    String(ticket.raisedBy.reportingManager) === session.userId

  if (!isOwner && !isAdmin && !isManagerWithAccess) return fail('You do not have access to this ticket', 403)

  return ok(ticket)
})
