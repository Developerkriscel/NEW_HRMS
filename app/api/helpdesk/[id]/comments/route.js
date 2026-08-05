export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth, requireTenantId } from '@/lib/auth'
import HelpdeskTicket from '@/models/HelpdeskTicket'

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  const tenantId = requireTenantId(session)
  const body = await req.json()
  if (!body.text) return fail('text is required', 400)

  const ticket = await HelpdeskTicket.findOne({ _id: params.id, tenantId }).populate('raisedBy', 'reportingManager')
  if (!ticket) return fail('Ticket not found', 404)

  const isOwner = String(ticket.raisedBy._id) === session.userId
  const isAdmin = ['HR_MANAGER', 'COMPANY_ADMIN', 'IT_ADMIN', 'SUPPORT_AGENT', 'SUPER_ADMIN'].includes(session.role)
  const isManagerWithAccess =
    session.role === 'MANAGER' && ticket.visibleToManager && String(ticket.raisedBy.reportingManager) === session.userId

  if (!isOwner && !isAdmin && !isManagerWithAccess) return fail('You cannot comment on this ticket', 403)

  ticket.comments.push({ text: body.text, by: session.userId, at: new Date() })
  await ticket.save()

  return ok(ticket, 'Comment added')
})
