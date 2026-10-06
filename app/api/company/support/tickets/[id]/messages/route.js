export const dynamic = 'force-dynamic'
import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import SupportTicketMessage from '@/models/SupportTicketMessage'
import SupportTicket from '@/models/SupportTicket'

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  if (!session.tenantId) return fail('Tenant not found for this account', 400, 'TENANT_NOT_FOUND')
  
  const ticket = await SupportTicket.findOne({ _id: params.id, tenant: session.tenantId })
  if (!ticket) return fail('Ticket not found', 404, 'TICKET_NOT_FOUND')

  const messages = await SupportTicketMessage.find({ ticket: params.id, isInternal: false })
    .populate('senderId', 'firstName lastName name profilePhoto')
    .sort({ createdAt: 1 })
    .lean()

  return ok(messages)
})

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  if (!session.tenantId) return fail('Tenant not found for this account', 400, 'TENANT_NOT_FOUND')

  const ticket = await SupportTicket.findOne({ _id: params.id, tenant: session.tenantId })
  if (!ticket) return fail('Ticket not found', 404, 'TICKET_NOT_FOUND')

  const { message, attachments } = await req.json()
  if (!message?.trim()) return fail('Message is required', 400, 'VALIDATION_ERROR')
  
  const msg = await SupportTicketMessage.create({
    ticket: ticket._id,
    senderId: session.userId,
    senderRole: 'COMPANY_ADMIN',
    message: message.trim(),
    attachments: attachments || [],
    isInternal: false
  })
  
  // Update ticket status if waiting for customer
  if (ticket.status === 'WAITING FOR CUSTOMER') {
    ticket.status = 'IN PROGRESS'
    await ticket.save()
  }

  return ok(msg)
})
