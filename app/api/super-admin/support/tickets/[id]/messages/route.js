export const dynamic = 'force-dynamic'
import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import SupportTicketMessage from '@/models/SupportTicketMessage'
import SupportTicket from '@/models/SupportTicket'

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'operator.view')
  
  const messages = await SupportTicketMessage.find({ ticket: params.id })
    .populate('senderId', 'name profilePhoto')
    .sort({ createdAt: 1 })
    .lean()

  return ok(messages)
})

export const POST = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'operator.update')

  const ticket = await SupportTicket.findById(params.id)
  if (!ticket) throw new Error('Ticket not found')

  const { message, attachments, isInternal } = await req.json()
  
  const msg = await SupportTicketMessage.create({
    ticket: ticket._id,
    senderId: session.userId,
    senderRole: 'PLATFORM_ADMIN',
    message,
    attachments: attachments || [],
    isInternal: isInternal || false
  })
  
  if (!isInternal && ticket.status === 'OPEN') {
      ticket.status = 'IN PROGRESS'
      await ticket.save()
  }

  return ok(msg)
})
