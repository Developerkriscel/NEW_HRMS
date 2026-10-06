export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import SupportTicket from '@/models/SupportTicket'

export const GET = withApi(async (_req, { params }) => {
  const session = await requireAuth()
  if (!session.tenantId) return fail('Tenant not found for this account', 400, 'TENANT_NOT_FOUND')

  const ticket = await SupportTicket.findOne({ _id: params.id, tenant: session.tenantId })
    .populate('assignedTo', 'name email')
    .lean()

  if (!ticket) return fail('Ticket not found', 404, 'TICKET_NOT_FOUND')
  return ok(ticket)
})
