export const dynamic = 'force-dynamic'
import { withApi } from '@/lib/handler'
import { ok, fail } from '@/lib/apiResponse'
import { requireAuth } from '@/lib/auth'
import { requirePlatformPermission } from '@/lib/platformRbac'
import SupportTicket from '@/models/SupportTicket'

export const GET = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'operator.view')
  
  const ticket = await SupportTicket.findById(params.id)
    .populate('tenant', 'companyName tenantCode subdomain')
    .populate('createdBy', 'firstName lastName email')
    .populate('assignedTo', 'name email')
    .lean()
    
  if (!ticket) return fail('Ticket not found', 404, 'TICKET_NOT_FOUND')
  return ok(ticket)
})

export const PATCH = withApi(async (req, { params }) => {
  const session = await requireAuth()
  requirePlatformPermission(session, 'operator.update')

  const { status, priority, assignedTo } = await req.json()
  
  const ticket = await SupportTicket.findById(params.id)
  if (!ticket) return fail('Ticket not found', 404, 'TICKET_NOT_FOUND')
  
  if (status) ticket.status = status
  if (priority) ticket.priority = priority
  if (assignedTo !== undefined) ticket.assignedTo = assignedTo
  
  if (status === 'RESOLVED') ticket.resolvedAt = new Date()
  if (status === 'CLOSED') ticket.closedAt = new Date()

  await ticket.save()
  
  return ok(ticket)
})
