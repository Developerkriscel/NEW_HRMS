export const dynamic = 'force-dynamic'

import { withApi } from '@/lib/handler'
import { ok } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import SupportTicket from '@/models/SupportTicket'

export const GET = withApi(async (req) => {
  const session = await requireAuth()
  if (!session.tenantId) throw new Error('Tenant not found')

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
  if (!session.tenantId) throw new Error('Tenant not found')
  // We can also verify if session.userId has company admin role if needed

  const body = await req.json()
  const { subject, description, category, priority, relatedModule, attachments } = body

  // Basic validation
  if (!subject || !description || !category || !priority) {
    throw new Error('Subject, description, category, and priority are required')
  }

  // Generate ticket number
  const ticketCount = await SupportTicket.countDocuments()
  const ticketNumber = `SUP-${(ticketCount + 1).toString().padStart(6, '0')}`

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

  return ok(ticket)
})
