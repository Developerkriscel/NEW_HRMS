export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import { logAction } from '@/lib/audit'
import HelpdeskTicket from '@/models/HelpdeskTicket'

const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'CLOSED']

export const PUT = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()
  if (!VALID_STATUSES.includes(body.status)) return fail('Invalid status', 400)

  const ticket = await HelpdeskTicket.findOne({ _id: params.id, tenantId }).populate('raisedBy', 'reportingManager')
  if (!ticket) return fail('Ticket not found', 404)

  const isOwner = String(ticket.raisedBy._id) === session.userId
  const isAdmin = ['HR_MANAGER', 'COMPANY_ADMIN', 'IT_ADMIN', 'SUPPORT_AGENT', 'SUPER_ADMIN'].includes(session.role)
  const isManagerWithAccess =
    session.role === 'MANAGER' && ticket.visibleToManager && String(ticket.raisedBy.reportingManager) === session.userId

  // Employees can only escalate their own ticket; status resolution/closing is for managers/admins.
  if (body.status === 'ESCALATED' && !isOwner && !isManagerWithAccess && !isAdmin) {
    return fail('You cannot escalate this ticket', 403)
  }
  if (['RESOLVED', 'CLOSED', 'IN_PROGRESS'].includes(body.status) && !isManagerWithAccess && !isAdmin) {
    return fail('Only a manager or admin can change this ticket to that status', 403)
  }

  ticket.status = body.status
  ticket.updatedBy = session.sub
  await ticket.save()

  await logAction(session, {
    action: 'HELPDESK_TICKET_STATUS_CHANGED',
    entityType: 'HelpdeskTicket',
    entityId: ticket._id,
    description: `Ticket "${ticket.subject}" set to ${body.status}`,
  })

  return ok(ticket, 'Ticket status updated')
})
