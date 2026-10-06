export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import SupportTicket from '@/models/SupportTicket'
import SupportTicketMessage from '@/models/SupportTicketMessage'
import mongoose from 'mongoose'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  if (!session.tenantId) return fail('Tenant not found for this account', 400, 'TENANT_NOT_FOUND')

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  
  let query = { tenant: session.tenantId }
  if (status) query.status = status

  const tickets = await SupportTicket.find(query)
    .populate('assignedTo', 'name')
    .sort({ createdAt: -1 })
    .lean()

  return ok(tickets)
})

export const POST = withApi(async (req) => {
  const session = await requireAuth()
  if (!session.tenantId) return fail('Tenant not found for this account', 400, 'TENANT_NOT_FOUND')
  // We can also verify if session.userId has company admin role if needed

  const body = await req.json()
  const { subject, description, category, priority, relatedModule, attachments } = body

  // Basic validation
  if (!subject || !description || !category || !priority) {
    return fail('Subject, description, category, and priority are required', 400, 'VALIDATION_ERROR')
  }

  const ticketNumber = `SUP-${new mongoose.Types.ObjectId().toString().slice(-8).toUpperCase()}`

  const ticket = await SupportTicket.create({
    ticketNumber,
    tenant: session.tenantId,
    createdBy: session.userId,
    subject,
    description,
    category,
    priority,
    relatedModule: relatedModule || null,
    attachments: attachments || [],
    status: 'OPEN'
  })

  await SupportTicketMessage.create({
    ticket: ticket._id,
    senderId: session.userId,
    senderRole: 'COMPANY_ADMIN',
    message: description,
    attachments: attachments || [],
    isInternal: false,
  })

  return ok(ticket, 'Support ticket created', 201)
})
